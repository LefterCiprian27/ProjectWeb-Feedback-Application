import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Feedback = sequelize.define(
  "Feedback",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    ts: { type: DataTypes.BIGINT, allowNull: false },
    userId: { type: DataTypes.BIGINT, allowNull: true }
  },
  { tableName: "feedback", timestamps: false }
);

export default Feedback;
