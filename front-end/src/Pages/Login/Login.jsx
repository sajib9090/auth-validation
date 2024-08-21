import { useContext, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";

const Login = () => {
  const { setUser, setToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isRegister) {
        const data = { name, email, password };
        const response = await axios.post(
          "http://localhost:8000/api/add-user",
          data
        );
        if (response?.data?.success) {
          navigate(`/otp-validation?otp=${response?.data?.data}`);
        }
      } else {
        const data = { email, password };
        const response = await axios.post(
          "http://localhost:8000/api/login",
          data
        );
        setUser(response?.data?.data);
        setToken(response?.data?.token);
        navigate("/dashboard");
      }
    } catch (error) {
      if (error?.response?.data?.message?.message == "You are not verified") {
        navigate(`/otp-validation?otp=${error?.response?.data?.message?.data}`);
      }
      setErrorMessage(error?.response?.data?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          {isRegister ? "Create Your Account" : "Login to Your Account"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(null);
              }}
            />
          </div>
          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
              />
              {password?.length > 0 && (
                <button
                  type="button"
                  className="absolute top-1.5 right-2 text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              )}
            </div>
          </div>
          {errorMessage && (
            <div className="flex items-center justify-between pb-4">
              <div className="w-full text-red-600">{errorMessage}</div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
            >
              {isLoading
                ? "Please wait..."
                : isRegister
                ? "Register"
                : "Sign In"}
            </button>
          </div>
          <div className="text-center mt-4">
            <a
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800 cursor-pointer"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMessage(null);
                setEmail("");
                setPassword("");
              }}
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
