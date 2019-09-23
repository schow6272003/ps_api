'use strict';
module.exports = (sequelize, DataTypes) => {
  const ZipToCbsa = sequelize.define('zip_to_cbsa', {
    id: DataTypes.INTEGER,
    zip_code: DataTypes.INTEGER,
    cbsa_id: DataTypes.INTEGER
  }, {});
  ZipToCbsa.associate = function(models) {
    // associations can be defined here
  };
  return ZipToCbsa;
};