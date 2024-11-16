// src/controllers/property.controller.js
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/database");
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

const propertiesCollection = () => getDB().collection("properties");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadCloudinary = async (localFilePath) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    console.log(response.url);
    return response.url;
  } catch (error) {
    console.error("Error uploading video to Cloudinary:", error);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw error;
  }
};

const getAllProperties = async (req, res) => {
  const { status, email, sort } = req.query;
  let query = {};
  if (status) query = { status: status };
  if (email) query = { agentEmail: email };

  let propertiesData;
  if (sort === "asc") {
    propertiesData = await propertiesCollection().find(query).sort({ minPrice: 1 }).toArray();
  } else if (sort === "desc") {
    propertiesData = await propertiesCollection().find(query).sort({ minPrice: -1 }).toArray();
  } else {
    propertiesData = await propertiesCollection().find(query).toArray();
  }

  const countData = await propertiesCollection().countDocuments(query);
  res.send({ propertiesData, countData });
};

const getPropertyById = async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await propertiesCollection().findOne(query);
  res.send(result);
};

const updateProperty = async (req, res) => {
  const id = req.params.id;
  const newData = req.body;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      propertyImage: newData.propertyImage,
      propertyTitle: newData.propertyTitle,
      propertyLocation: newData.propertyLocation,
      priceRange: newData.priceRange,
      minPrice: newData.minPrice,
      maxPrice: newData.maxPrice,
      agentName: newData.agentName,
    }
  };
  const result = await propertiesCollection().updateOne(filter, updateDoc);
  res.send(result);
};

// const createProperty = async (req, res) => {
//   const property = req.body;
//   const result = await propertiesCollection().insertOne(property);
//   res.send(result);
// };

const createProperty = async (req, res) => {
  try {
    const property = JSON.parse(req.body.property);
    console.log("Received property:", property);

    if (req.files && req.files.VideoPitch && req.files.VideoPitch[0]) {
      const videoFilePath = req.files.VideoPitch[0].path;
      const videoUrl = await uploadCloudinary(videoFilePath);
      property.videoPitchUrl = videoUrl;
    }

    const result = await propertiesCollection().insertOne(property);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({ error: "Failed to create property." });
  }
};

const deleteProperty = async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await propertiesCollection().deleteOne(query);
  res.send(result);
};

const verifyProperty = async (req, res) => {
  const id = req.query.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = { $set: { status: "verified" } };
  const result = await propertiesCollection().updateOne(filter, updateDoc);
  res.send(result);
};

const rejectProperty = async (req, res) => {
  const id = req.query.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = { $set: { status: "rejected" } };
  const result = await propertiesCollection().updateOne(filter, updateDoc);
  res.send(result);
};

module.exports = {
  getAllProperties,
  getPropertyById,
  updateProperty,
  createProperty,
  deleteProperty,
  verifyProperty,
  rejectProperty
};