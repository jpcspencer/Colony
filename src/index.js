// index.js — Colony entry point

const { runColony } = require('./loop');

// Your research goal goes here
const goal = "Identify contradictions and understudied gaps in lithium-sulfur battery research from papers published between 2023 and 2025";

runColony(goal).catch(console.error);