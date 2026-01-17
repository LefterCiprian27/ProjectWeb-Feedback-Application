import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Feedback = sequelize.define("Feedback", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(10), allowNull: false },
  type: { type: DataTypes.ENUM("happy", "sad", "surprised", "confused"), allowNull: false },
  ts: { type: DataTypes.BIGINT, allowNull: false }
}, { tableName: "feedback", timestamps: false });

export default Feedback;
