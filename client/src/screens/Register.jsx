import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "../../Utils/UserContext";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [islogin, setIsLogin] = useState(false);

  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  const handleSubmit = async () => {
    try {
      const { data } = await axios.post(`/${islogin ? "login" : "register"}`, {
        username,
        password,
      });
      setLoggedInUsername(data.data.username);
      setId(data.data.userId);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form className="w-64 mx-auto mb-12">
        <input
          type="text"
          placeholder="username"
          className="block w-full rounded-sm p-2 mb-2 border"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          type="password"
          placeholder="password"
          className="block w-full rounded-sm p-2 mb-2 border"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-blue-500 text-white block w-full rounded-sm p-2"
        >
          {islogin ? "Login" : "Register"}
        </button>
        <div className="text-center mt-2">
          {!islogin ? "Already a member ? " : "Don't have an account ? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!islogin);
            }}
          >
            {!islogin ? "login" : "register"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;
