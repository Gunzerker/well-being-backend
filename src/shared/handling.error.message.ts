export const Exceptionlookup = (exception: any) => {
  console.log(exception.toString());
  console.log(exception.message);
  console.log(exception.stack);
  const [, lineno, colno] = exception.stack.match(/(\d+):(\d+)/);
  console.log('Line:', lineno);
  console.log('Column:', colno);
};
