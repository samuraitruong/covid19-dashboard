module.exports = {
  toNumber: (stringNumber) => {
    if (!stringNumber) return 0;
    if (!stringNumber.replace) return stringNumber;

    stringNumber = stringNumber.replace(",", "");
    stringNumber = stringNumber.replace("+", "");
    return parseInt(stringNumber, 10) || 0;
  },
  momentToTimestamp: (m) => {
    return m.unix() * 1000000000
  }
}