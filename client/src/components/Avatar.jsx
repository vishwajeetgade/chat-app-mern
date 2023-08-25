import React from "react";
import PropTypes from "prop-types";

const AVATAR_COLORS = [
  "bg-red-200",
  "bg-green-200",
  "bg-purple-200",
  "bg-blue-200",
  "bg-yellow-200",
  "bg-cyan-200",
  "bg-teal-200",
];

const Avatar = React.memo(({ userId, username, online }) => {
  return (
    <div
      className={`w-8 h-8 relative rounded-full flex justify-center items-center ${
        AVATAR_COLORS[Math.floor(Math.random() * 7)]
      }`}
    >
      <div className="text-center w-full opacity-70">
        {username[0].toUpperCase()}
      </div>
      {online && (
        <div
          className="absolute w-3 h-3 bg-green-400 bottom-0 
      right-0 rounded-full border border-white"
        ></div>
      )}
    </div>
  );
});

Avatar.propTypes = {
  userId: PropTypes.string,
  username: PropTypes.string,
};

export default Avatar;
