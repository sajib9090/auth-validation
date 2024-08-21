import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import createError from "http-errors";
import connectDB from "./src/app/config/db.js";
import { port } from "./secrets.js";
import { client } from "./src/app/config/db.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { emailWithNodeMailer } from "./src/app/utils/email.js";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db_name = "USER_VALIDATION";

const usersCollection = client.db(db_name).collection("users");
const otpCollection = client.db(db_name).collection("one_time_passwords");

app.post("/api/login", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      throw createError(400, "email and password are required fields");
    }
    const processedEmail = email?.toLowerCase();
    if (!validator.isEmail(processedEmail)) {
      throw createError(400, "Invalid email address");
    }

    const existingUser = await usersCollection.findOne({
      email: processedEmail,
    });

    if (!existingUser) {
      throw createError(400, "User not found");
    }

    const trimmedPassword = password.replace(/\s/g, "");
    if (trimmedPassword.length < 6 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 6 characters long and not more than 30 characters long"
      );
    }

    const matchedPassword = await bcrypt.compare(
      password,
      existingUser?.password
    );
    if (!matchedPassword) {
      return next(createError.Unauthorized("Invalid Password"));
    }

    if (!existingUser?.email_verified) {
      // generate OTP
      const OTP = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
      const salt = await bcrypt.genSalt(10);
      const hashedOTP = await bcrypt.hash(OTP, salt);

      const optInfo = {
        user_id: existingUser?._id,
        otp: hashedOTP,
        createdAt: new Date(),
      };

      const opt = await otpCollection.insertOne(optInfo);
      if (!opt?.insertedId) {
        throw createError(500, "Something wrong try again");
      }

      const emailData = {
        email,
        subject: "Verify Your Email Address for Account Activation",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
             <p>Thank you for registering with us. To complete your account creation, please verify your email address using the
              One-Time Password (OTP) provided below.</p>
            <div style="background-color: #f2f2f2; padding: 10px; margin: 10px 0; border-radius: 5px; text-align: center;">
             <p style="font-size: 18px; font-weight: bold;">Your OTP is:</p>
             <p style="font-size: 34px; font-weight: bold; color: #FF5722; margin-top:-10px">${OTP}</p>
            </div>
              <p>This OTP is valid for 5 minutes. Please enter it on the verification page to activate your account.</p>
              <p>If you did not request this, please ignore this email.</p>
            <p>Best regards,</p>
          <p>The [Your Company] Team</p>
         <hr>
         <p style="font-size: 12px; color: #888;">If you have any questions, feel free to contact our support team at
        support@yourcompany.com.</p>
        </div>
          `,
      };

      // send email with nodemailer
      try {
        await emailWithNodeMailer(emailData);
      } catch (emailError) {
        next(createError(500, "Failed to send verification email", emailError));
      }

      return next(
        createError.Unauthorized({
          message: "You are not verified",
          data: existingUser?._id,
        })
      );
    }
    delete existingUser.password;

    const userInfo = existingUser;

    const token = jwt.sign(userInfo, "secretKey", { expiresIn: "1d" });

    res.status(200).send({
      success: true,
      message: "LoggedIn successfully",
      data: existingUser,
      token: token,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/add-user", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      throw createError(400, "email and password are required fields");
    }
    const processedEmail = email?.toLowerCase();
    if (!validator.isEmail(processedEmail)) {
      throw createError(400, "Invalid email address");
    }

    const existingEmail = await usersCollection.findOne({
      email: processedEmail,
    });
    if (existingEmail) {
      throw createError(400, "Email already exist. Please login");
    }

    const trimmedPassword = password.replace(/\s/g, "");
    if (trimmedPassword.length < 6 || trimmedPassword.length > 30) {
      throw createError(
        400,
        "Password must be at least 6 characters long and not more than 30 characters long"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    const newUser = {
      email: processedEmail,
      password: hashedPassword,
      email_verified: false,
      createdAt: new Date(),
    };

    const user = await usersCollection.insertOne(newUser);
    if (!user?.insertedId) {
      throw createError(500, "User not added. Try again");
    }

    // generate OTP
    const OTP = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
    const hashedOTP = await bcrypt.hash(OTP, salt);

    const optInfo = {
      user_id: user?.insertedId,
      otp: hashedOTP,
      createdAt: new Date(),
    };

    const opt = await otpCollection.insertOne(optInfo);
    if (!opt?.insertedId) {
      throw createError(500, "Something wrong try again");
    }

    // prepare email
    const emailData = {
      email,
      subject: "Verify Your Email Address for Account Activation",
      html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
	         <p>Thank you for registering with us. To complete your account creation, please verify your email address using the
		        One-Time Password (OTP) provided below.</p>
	        <div style="background-color: #f2f2f2; padding: 10px; margin: 10px 0; border-radius: 5px; text-align: center;">
		       <p style="font-size: 18px; font-weight: bold;">Your OTP is:</p>
		       <p style="font-size: 34px; font-weight: bold; color: #FF5722; margin-top:-10px">${OTP}</p>
	        </div>
	          <p>This OTP is valid for 5 minutes. Please enter it on the verification page to activate your account.</p>
	          <p>If you did not request this, please ignore this email.</p>
        	<p>Best regards,</p>
	      <p>The [Your Company] Team</p>
	     <hr>
	     <p style="font-size: 12px; color: #888;">If you have any questions, feel free to contact our support team at
		  support@yourcompany.com.</p>
      </div>
        `,
    };

    // send email with nodemailer
    try {
      await emailWithNodeMailer(emailData);
    } catch (emailError) {
      next(createError(500, "Failed to send verification email", emailError));
    }

    res.status(200).send({
      success: true,
      message: `Please go to your email at- ${email} and complete registration process`,
      data: user?.insertedId,
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/verify-user", async (req, res, next) => {
  const { id } = req.query;
  const { otp } = req.body;
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      throw createError(404, "User not found");
    }

    const existingOtp = await otpCollection.findOne(
      {
        user_id: new ObjectId(user?._id),
      },
      { projection: { otp: 1, createdAt: 1, _id: 0 } },
      { sort: { createdAt: -1 } }
    );

    if (!existingOtp) {
      throw createError(404, "OTP not found");
    }

    const currentTime = new Date();
    const otpCreationTime = new Date(existingOtp.createdAt);
    const timeDifference = (currentTime - otpCreationTime) / (1000 * 60);

    if (timeDifference > 2) {
      throw createError(400, "OTP has expired");
    }

    // match otp
    const isOtpValid = await bcrypt.compare(otp, existingOtp.otp);
    if (!isOtpValid) {
      return next(createError.Unauthorized("Invalid OTP"));
    }

    const updateUser = {
      $set: {
        email_verified: true,
        updatedAt: new Date(),
      },
    };

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      updateUser
    );

    if (result?.modifiedCount > 0) {
      await otpCollection.deleteMany({
        user_id: new ObjectId(user?._id),
      });
    }
    delete user.password;

    const userInfo = user;

    const token = jwt.sign(userInfo, "secretKey", { expiresIn: "1d" });

    res.status(200).send({
      success: true,
      message: "OTP verified",
      data: user,
      token: token,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/re-generate-otp/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { email_verified: 1, email: 1 } }
    );
    if (!user) {
      throw createError(404, "User not found");
    }
    if (user?.email_verified) {
      throw createError(400, "Email already verified");
    }

    await otpCollection.deleteMany({
      user_id: new ObjectId(user?._id),
    });

    // generate OTP
    const salt = await bcrypt.genSalt(10);
    const OTP = crypto.randomInt(0, 1000000).toString();
    const hashedOTP = await bcrypt.hash(OTP, salt);

    const optInfo = {
      user_id: user?._id,
      otp: hashedOTP,
      createdAt: new Date(),
    };

    const opt = await otpCollection.insertOne(optInfo);
    if (!opt?.insertedId) {
      throw createError(500, "Something wrong try again");
    }

    // prepare email
    const emailData = {
      email: user?.email,
      subject: "Verify Your Email Address for Account Activation",
      html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
           <p>Thank you for registering with us. To complete your account creation, please verify your email address using the
            One-Time Password (OTP) provided below.</p>
          <div style="background-color: #f2f2f2; padding: 10px; margin: 10px 0; border-radius: 5px; text-align: center;">
           <p style="font-size: 18px; font-weight: bold;">Your OTP is:</p>
           <p style="font-size: 34px; font-weight: bold; color: #FF5722; margin-top:-10px">${OTP}</p>
          </div>
            <p>This OTP is valid for 5 minutes. Please enter it on the verification page to activate your account.</p>
            <p>If you did not request this, please ignore this email.</p>
        	<p>Best regards,</p>
        <p>The [Your Company] Team</p>
       <hr>
       <p style="font-size: 12px; color: #888;">If you have any questions, feel free to contact our support team at
      support@yourcompany.com.</p>
      </div>
        `,
    };

    // send email with nodemailer
    try {
      await emailWithNodeMailer(emailData);
    } catch (emailError) {
      next(createError(500, "Failed to send verification email", emailError));
    }

    res.status(200).send({
      success: true,
      message: `Please go to your email at- ${user?.email} and complete verification process`,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/", (req, res) => {
  res.status(200).send({
    success: true,
    message: "Server is running",
  });
});

//client error handling
app.use((req, res, next) => {
  next(createError(404, "Route not found!"));
});

//server error handling
app.use((err, req, res, next) => {
  return res.status(err.status || 500).json({
    success: false,
    message: err.message,
  });
});

app.listen(port, async () => {
  console.log(`user validation app listening on port ${port}`);
  await connectDB();
});
