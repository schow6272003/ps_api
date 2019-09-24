'use strict';
module.exports = (sequelize, DataTypes) => {
  const CbsaToMsa = sequelize.define('cbsa_to_msa', {
    id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    cbsa_id: DataTypes.INTEGER
  }, {});
  CbsaToMsa.associate = function(models) {
    // associations can be defined here
  };
  return CbsaToMsa;
};