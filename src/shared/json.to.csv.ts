export function convertToCSV(arr) {
  const array = [Object.keys(arr[0])].concat(arr);

  return array
    .map((it) => {
      return Object.values(it).toString();
    })
    .join('\n');
}

// const csv = Object.keys(data)
//   .map((key) => `${key},${data[key]}`)
//   .join('\n');
