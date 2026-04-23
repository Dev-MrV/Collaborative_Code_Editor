const API = "http://localhost:5005/api/rooms";

export const createRoom = async () => {
  const res = await fetch(`${API}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  return res.json();
};

export const joinRoom = async (roomId: string) => {
  const res = await fetch(`${API}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ roomId }),
  });
  return res.json();
};
