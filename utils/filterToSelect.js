const filterToSelect = (obj, ...allowedFields) => {
  let s = '';
  Object.keys(obj).forEach((el) => {
    if (!allowedFields.includes(el)) s += `-${el} `;
  });

  return s;
};

module.exports = filterToSelect;
