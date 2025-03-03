import { Mongo } from "meteor/mongo";

export const Calls = new Mongo.Collection("calls");
export const Offers = new Mongo.Collection("offers");
export const ConnectedUsers = new Mongo.Collection('connectedUsers');

