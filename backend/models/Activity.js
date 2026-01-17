import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Activity = sequelize.define("Activity", {
  code: { type: DataTypes.STRING(10), primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  startsAt: { type: DataTypes.BIGINT, allowNull: false },
  endsAt: { type: DataTypes.BIGINT, allowNull: false },
  createdAt: { type: DataTypes.BIGINT, allowNull: false }
}, { tableName: "activities", timestamps: false });

export default Activity;
