import nodemailer from "nodemailer";
import env from "../config/env.js";
import { AppError } from "../utils/appError.js";
import escapeHTML from "escape-html";

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth : {
    user : env.emailUser,
    pass : env.emailPassword
  }
});

interface SendEmailInput {
  to : string;
  subject : string;
  text : string;
  html : string;
}

export const sendEmail = async({
  to , subject, text, html
}: SendEmailInput) => {
  try {
    await transporter.sendMail({
      from : `CogniFace <${env.emailUser}>`,
      to,
      subject,
      text,
      html
    });
  } catch (error) {
    throw new AppError(
      "Unable to send email",
      502
    );
  }  
};

const buildPasswordSetupUrl = (
  rawToken : string
) => {
  const url = new URL(
    env.passwordSetupUrl
  );

  url.searchParams.set(
    "token",
    rawToken
  );

  return url.toString();
}

export const sendWelcomeEmail = async (
  email : string,
  firstName : string,
  rawToken : string
) : Promise<void> => {
  const setupUrl = buildPasswordSetupUrl(rawToken);

  const safeName = escapeHTML(firstName);
  const safeUrl = escapeHTML(setupUrl);

  await sendEmail({
    to : email,
    subject : "Welcome to CogniFace - Set Up Your Account",

    text : `
    Hi ${firstName},

    Welcome to CogniFace!

    An account has been created for you by your administrator. To get started, please set up your password using the link below:

    ${setupUrl}

    This link will expire in 24 hours. If it expires, you can request a new setup link from the CogniFace login page or contact your administrator.

    CogniFace
    `.trim(),
    html:`
      <h2>Welcome to CogniFace!</h2>

      <p>Hi ${safeName},</p>

      <p>
        An account has been created for you by your administrator.
        To get started, please set up your password using the link below.
      </p>

      <p>
        <a href="${safeUrl}">Set Up My Account</a>
      </p>
      <p>
        This link will expire in 24 hours. If it expires, you can
        request a new setup link from the CogniFace login page or
        contact your administrator.
      </p>

      <p>
        <strong> CogniFace </strong>
      </p>
      `
  });
};

export const sendPasswordResetEmail = async (
  email : string,
  firstName : string,
  rawToken : string
): Promise<void> => {
  const setUpUrl = buildPasswordSetupUrl(rawToken);

  const safeName = escapeHTML(firstName);
  const safeUrl = escapeHTML(setUpUrl);

  await sendEmail({
    to : email,
    subject : "Reset your CogniFace password",

    text : 
      `Hi ${firstName},reset your CogniFace password here: ${setUpUrl}`,
    
    html : `
      <h2>Reset your password</h2>

      <p>Hi ${safeName},</p>

      <p>
        A password reset was requested for your CogniFace account.
      </p>

      <p>
        <a href="${safeUrl}">
          Reset password
        </a>
      </p>

      <p>
      <strong> CogniFace </strong>
      </p>
    `,
  });
};