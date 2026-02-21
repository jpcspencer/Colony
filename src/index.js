// index.js — Colony entry point

const { runColony } = require('./loop');

// Your research goal goes here
const goal = "What are the most promising breakthroughs in solid-state battery technology and what is preventing mass adoption?";

runColony(goal).catch(console.error);