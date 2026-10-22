import "dotenv/config";
import mongoose from "mongoose";

// Run explicitly after backing up your database. Original collections are preserved.
if (!process.env.MONGO_URI) throw new Error("Set MONGO_URI before migrating.");
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
let migrated = 0;
for await (const user of db.collection("users").find({})) {
  const email = user.email.trim().toLowerCase();
  if (
    await db.collection("auth_users").findOne({ email, _id: { $ne: user._id } })
  ) {
    throw new Error(
      "An email already belongs to a new Edith account. Resolve ownership before migration. Original data is preserved.",
    );
  }
  await db
    .collection("auth_users")
    .updateOne(
      { _id: user._id },
      {
        $setOnInsert: {
          name: user.name,
          email,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  await db
    .collection("auth_accounts")
    .updateOne(
      { userId: user._id, providerId: "credential" },
      {
        $setOnInsert: {
          userId: user._id,
          accountId: String(user._id),
          providerId: "credential",
          password: user.password,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  migrated++;
}
await db
  .collection("tasks")
  .updateMany(
    { completed: true, status: { $exists: false } },
    { $set: { status: "done" } },
  );
await db
  .collection("tasks")
  .updateMany(
    { status: { $exists: false } },
    { $set: { status: "todo", tags: [], subtasks: [] } },
  );
await db
  .collection("expenses")
  .updateMany({ amountMinor: { $exists: false } }, [
    {
      $set: {
        amountMinor: { $round: [{ $multiply: ["$amount", 100] }, 0] },
        currency: "USD",
      },
    },
  ]);
console.log(
  `Migrated ${migrated} accounts. Original passwords work; previous JWT sessions are retired.`,
);
await mongoose.disconnect();
