import Route from "./components/Route";

import axios from "axios";

function App() {
  axios.defaults.baseURL = "http://localhost:5001/api/v1";
  // set cookies in api call
  axios.defaults.withCredentials = true;

  return <Route />;
}

export default App;
