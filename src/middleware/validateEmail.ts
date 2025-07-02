import { ZoltraHandler } from "../types";

/**
 * Middleware function to validate the email format in the request body.
 *
 * This middleware checks if the email field is present and if the email address
 * matches a regular expression for proper email formatting. If the email is invalid,
 * a `400` status with an error message will be returned.
 *
 * @param {ZoltraRequest} req - The request object containing the email field.
 * @param {ZoltraResponse} res - The response object to send error messages if validation fails.
 * @param {ZoltraNext} next - The next middleware function to call if validation passes.
 * @returns {void}
 *
 * @example
 * // routes/auth.ts
 * export const routes = defineRoutes([
 *  {
      path: "/sign-up",
      method: "POST",
      handler: registerUser,
      middleware: [validateEmail]
    },
 * ])
 */
const validateEmail: ZoltraHandler = (req, res, next) => {
  const { email } = req.body;

  // Regular expression for validating email
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format. Please provide a valid email address.",
    });
  }

  next(); // Proceed to the next middleware or route handler
};

export default validateEmail;
