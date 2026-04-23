import React from "react";
import { Routes, Route } from "react-router-dom";
import Signup from "./pages/signup";
import IDE from "./components/IDE";
import Login from "./pages/login";

function App() {
  return (
    <Routes>
      
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<IDE />} />
    </Routes>
  );
}

export default App;
