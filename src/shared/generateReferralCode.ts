const characters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const generateRereferralCode = (length: number) => {
  let result = '0';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const generateRereferralCode2 = (length: number) => {
  let result = '0';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result + Date.now().toString().slice(0, 2);
};

export const generatePassword = (length:number) => {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let password = '';
    
    // add an uppercase character
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
    
    // add two numbers
    for (let i = 0; i < 2; i++) {
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    // fill the remaining positions with random characters
    const allChars = uppercaseChars + numbers;
    const remainingLength = length - password.length;
    for (let i = 0; i < remainingLength; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // shuffle the password
    password = password.split('').sort(function() {return 0.5-Math.random()}).join('');
    
    return password;
}
