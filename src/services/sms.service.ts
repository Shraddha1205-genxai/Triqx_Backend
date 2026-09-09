/**
 * Development SMS Service Function
 * Logs OTP code for development and testing without external SMS provider overhead.
 */
export const sendSms = async (mobileNumber: string, messageOrOtp: string, rawOtp?: string): Promise<boolean> => {
  const otp = rawOtp || messageOrOtp;
  console.log(`[SMS Service Dev Mode] Mobile: ${mobileNumber} | OTP Code: ${otp}`);
  return true;
};

export default {
  sendSms,
};
