import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Activity = sequelize.define(
  "Activity",
  {
    code: { type: DataTypes.STRING, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    startsAt: { type: DataTypes.BIGINT, allowNull: false },
    endsAt: { type: DataTypes.BIGINT, allowNull: false },
    createdAt: { type: DataTypes.BIGINT, allowNull: false },
    professorId: { type: DataTypes.BIGINT, allowNull: true }
  },
  { tableName: "activities", timestamps: false }
);

export default Activity;
