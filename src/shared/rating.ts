export const onRating = (users: number[]) => {
  let total: number = 0;
  let totalRate: number = 0;
  let rate1: number = 0;
  let rate2: number = 0;
  let rate3: number = 0;
  let rate4: number = 0;
  let rate5: number = 0;
  users.map((ratingValue) => {
    switch (ratingValue) {
      case 1: {
        rate1 = rate1 + 1;
        break;
      }
      case 2: {
        rate2 = rate2 + 1;
        break;
      }
      case 3: {
        rate3 = rate3 + 1;
        break;
      }
      case 4: {
        rate4 = rate4 + 1;
        break;
      }
      case 5: {
        rate5 = rate5 + 1;
        break;
      }
      default: {
        break;
      }
    }
  });
  //console.log(rate1, rate2, rate3, rate4, rate5);
  total = rate1 * 1 + rate2 * 2 + rate3 * 3 + rate4 * 4 + rate5 * 5;
  totalRate = rate1 + rate2 + rate3 + rate4 + rate5;
  const avg = (total / totalRate).toPrecision(2);
  if (avg.split('.')[1] == '0') {
    return { ratingNote: Number(avg.split('.')[0]), totalRating: users.length };
  } else {
    //console.log(total, totalRate, avg);
    return { ratingNote: Number(avg), totalRating: users.length };
  }
};

// export const onRatingv2 = (
//   newRatingValue: number,
//   oldRating: { ratingNote: number; totalRating: number },
// ) => {
//   return {
//     ratingNote:
//       (oldRating.ratingNote * oldRating.totalRating + newRatingValue) /
//       (oldRating.totalRating + 1),
//     totalRating: oldRating.totalRating + 1,
//   };
// };
const getApprox = (num1) => {
  const number = parseInt(num1, 10);
  if (num1 - number > 0.6000000000000001) {
    return number + 1;
  } else if (num1 - number < 0.3999999999999999) {
    return number;
  } else if (
    num1 - number == 0.3999999999999999 ||
    num1 - number == 0.6000000000000001 ||
    num1 - number == 0.5
  ) {
    return number + 0.5;
  }
};

export const onRatingv2 = (
  newRatingValue: number,
  oldRating: { ratingNote: number; totalRating: number },
) => {
  if (oldRating == undefined) {
    oldRating = { ratingNote: 0, totalRating: 0 };
  }
  const newTotalRating = oldRating.totalRating + 1;
  console.log('new fromule');
  console.log(
    oldRating.ratingNote +
      ' * ' +
      oldRating.totalRating +
      '+' +
      newRatingValue +
      ') /' +
      newTotalRating,
  );

  const valueNote =
    (oldRating.ratingNote * oldRating.totalRating + newRatingValue) /
    newTotalRating;

  console.log('note value', valueNote);

  return {
    shownStarsNumber: getApprox(valueNote.toFixed(1)),
    ratingNote: valueNote.toFixed(1),
    totalRating: newTotalRating,
  };
};
//! 'gold formule '
// 'oldRating.ratingNote+newRatingValue/oldRating.totalRating
// ' (oldRating.ratingNote * oldRating.totalRating )+newRatingValue/(oldRating.totalRating + 1),'

// ' ==2*2+4/3=2.66'
// '1*1+3/2'
// 'new= 2.66*3+5/4'

//
//
//
//
