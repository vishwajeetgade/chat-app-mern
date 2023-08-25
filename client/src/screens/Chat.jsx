import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import { UserContext } from "../../Utils/UserContext";
import Logo from "../components/Logo";
import { uniqBy } from "lodash";
import axios from "axios";

const Chat = () => {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const { id, setUsername, setId } = useContext(UserContext);
  const divUnderMessages = useRef();

  useEffect(() => {
    connectToWebSocket();
  }, []);

  function connectToWebSocket() {
    const ws = new WebSocket("ws://localhost:5001");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected. Trying to reconnect");
        connectToWebSocket();
      }, 1000);
    });
  }

  const handleMessage = (ev) => {
    const messageData = JSON.parse(ev.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  };

  const showOnlinePeople = (peopleArray) => {
    const people = {};

    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  };

  const selectContact = (userId) => {
    setSelectedUserId(userId);
  };

  const handleSendMessage = () => {
    ws.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessage,
      })
    );
    setMessages((prev) => [
      ...prev,
      {
        text: newMessage,
        sender: id,
        recipient: selectedUserId,
        _id: Date.now(),
      },
    ]);
    setNewMessage("");
  };

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behaviour: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get(`/messages/${selectedUserId}`).then(({ data }) => {
        setMessages(data.data);
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeople = res.data.data
        .filter((p) => p._id !== id)
        .filter(
          (p) =>
            !Object.keys(onlinePeople)
              .map((op) => op._id)
              .includes(p._id)
        );
      // console.log(offlinePeople);
    });
  }, [onlinePeople]);

  const handleLogout = async () => {
    const { data } = await axios.get("/logout");
    console.log(data.message);
    setId(null);
    setUsername(null);
  };

  const onlinePeopleExcludingOurUser = { ...onlinePeople };
  delete onlinePeopleExcludingOurUser[id];

  const messagesWithoutDuplicate = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />

          {Object.keys(onlinePeopleExcludingOurUser).map((userId) => (
            <div
              className={`border-b border-gray-100 flex items-center gap-2 cursor-pointer ${
                userId === selectedUserId ? "bg-blue-50" : ""
              }`}
              key={userId}
              onClick={() => selectContact(userId)}
            >
              {userId === selectedUserId && (
                <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
              )}
              <div className="flex gap-2 py-2 pl-4 items-center">
                <Avatar
                  online={true}
                  username={onlinePeople[userId]}
                  userId={userId}
                />
                <span className="text-gray-800">{onlinePeople[userId]}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 text-center">
          <button
            className="text-sm text-gray-500 bg-blue-100
          py-1 px-2 border rounded-sm"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-col bg-blue-50 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">
                &larr; Select a person from the sidebar
              </div>
            </div>
          )}
          {selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute inset-0 top-0 left-0 right-0 bottom-0">
                {messagesWithoutDuplicate.map((msg, index) => (
                  <div
                    key={`${index}-${selectedUserId}-${id}`}
                    className={`${
                      msg.sender === id ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`${
                        msg.sender === id
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-500"
                      } p-2 my-2 rounded-md text-sm inline-block text-left`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {selectedUserId && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your message here"
              className="bg-white border p-2 flex-grow rounded-sm"
              value={newMessage}
              onChange={(ev) => setNewMessage(ev.target.value)}
            />
            <button
              className="bg-blue-500 p-2 text-white rounded-sm"
              onClick={handleSendMessage}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
