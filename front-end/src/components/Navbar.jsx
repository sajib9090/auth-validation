import { NavLink } from "react-router-dom";
import { AuthContext } from "../Context/AuthContext";
import { useContext } from "react";

const Navbar = () => {
  const { user, setUser } = useContext(AuthContext);

  return (
    <div>
      <ul className="flex items-center py-4 bg-gray-200 space-x-6 font-semibold justify-center">
        <NavLink
          to="/"
          className={({ isActive }) => isActive && "text-blue-600"}
        >
          Home
        </NavLink>
        {!user ? (
          <NavLink
            to="/login"
            className={({ isActive }) => isActive && "text-blue-600"}
          >
            Login
          </NavLink>
        ) : (
          <div className="flex space-x-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => isActive && "text-blue-600"}
            >
              Dashboard
            </NavLink>
            <p className="text-yellow-600">{user?.email}</p>
            <button onClick={() => setUser(null)}>Logout</button>
          </div>
        )}
      </ul>
    </div>
  );
};

export default Navbar;
