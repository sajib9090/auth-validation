import { useContext } from "react";
import { AuthContext } from "../../Context/AuthContext";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  return (
    <div>
      <h1>This is the private route</h1>
      <h2 className="text-2xl">Welcome {user?.email}</h2>
    </div>
  );
};

export default Dashboard;
