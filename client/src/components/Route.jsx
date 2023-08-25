import { useContext } from "react";
import Register from "../screens/Register";
import { UserContext } from "../../Utils/UserContext";
import Chat from "../screens/Chat";

const Route = () => {
  const { username } = useContext(UserContext);

  if (username) {
    return <Chat />;
  }
  return <Register />;
};

export default Route;
