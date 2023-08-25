import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const UserContext = createContext({});

export const UserContextProvider = ({ children }) => {
  const [username, setUsername] = useState(null);
  const [id, setId] = useState(null);
  useEffect(() => {
    axios.get("/profile").then(({ data }) => {
      setId(data.data.userId);
      setUsername(data.data.username);
    });
  }, []);

  const value = {
    username,
    setUsername,
    id,
    setId,
  };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
