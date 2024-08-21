import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";

const OtpValidation = () => {
  const { setUser, setToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [remainingTime, setRemainingTime] = useState(120);
  const [isOtpResent, setIsOtpResent] = useState(false);

  useEffect(() => {
    const countdown = setInterval(() => {
      setRemainingTime((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    if (remainingTime === 0) {
      setIsOtpResent(false);
    }

    return () => clearInterval(countdown);
  }, [remainingTime]);

  const handleChange = (e, index) => {
    const newOtp = [...otp];
    newOtp[index] = e.target.value;
    setOtp(newOtp);

    if (e.target.value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
    setErrorMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const otpCode = otp.join("");
    const id = location.search.split("=")[1];
    if (id) {
      try {
        const response = await axios.patch(
          `http://localhost:8000/api/verify-user?id=${id}`,
          { otp: otpCode }
        );
        if (response?.data?.success) {
          setUser(response?.data?.data);
          setToken(response?.data?.token);
          navigate("/dashboard");
        }
      } catch (error) {
        setErrorMessage(
          error?.response?.data?.message || "Invalid OTP. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsOtpResent(false);

    const id = location.search.split("=")[1];
    if (id) {
      try {
        const response = await axios.post(
          `http://localhost:8000/api/re-generate-otp/${id}`
        );
        if (response?.data?.success) {
          setRemainingTime(120);
          setOtp(["", "", "", "", "", ""]);
          setIsOtpResent(true);
        } else {
          setErrorMessage("Failed to resend OTP. Please try again.");
        }
      } catch (error) {
        setErrorMessage(
          error?.response?.data?.message ||
            "Failed to resend OTP. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Enter the OTP Code
        </h2>
        <p className="text-gray-600 text-center mb-4">
          Please enter the 6-digit code we sent to your email.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                className="shadow appearance-none border rounded w-12 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-center text-2xl"
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e, index)}
              />
            ))}
          </div>
          {errorMessage && (
            <div className="flex items-center justify-between pb-4">
              <div className="w-full text-red-600 text-center">
                {errorMessage}
              </div>
            </div>
          )}
          <div className="text-gray-600 text-center mb-4">
            {remainingTime > 0 ? (
              <p>Time remaining: {formatTime(remainingTime)}</p>
            ) : (
              <p className="text-red-600">
                OTP expired.{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-blue-500 underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              </p>
            )}
          </div>
          {isOtpResent && remainingTime > 0 && (
            <div className="text-green-600 text-center mb-4">
              OTP has been re-sent successfully!
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              disabled={isLoading || remainingTime === 0 || !isOtpComplete}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
            >
              {isLoading ? "Validating..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpValidation;
