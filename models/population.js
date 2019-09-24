'use strict';
module.exports = (sequelize, DataTypes) => {
  const Population = sequelize.define('population', {
    id: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    cbsa_id: DataTypes.INTEGER,
    number: DataTypes.INTEGER
  }, {});
  Population.associate = function(models) {
    // associations can be defined here
  };
  return Population;
};