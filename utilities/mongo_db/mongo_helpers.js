function mongoHelpers(){};

mongoHelpers.isRequestValid = (arg) => {
  if (!arg) {
    return false;
  } else if (!arg.cbsa_ids && !arg.zip_codes && !arg.name){
    return false;
  } 
  return true;
};

mongoHelpers.parseArray = (records) => {
  if (!records) return [];
  let result = Array.isArray(records) ? records : Object.keys(records).map((key)=> { return records[key]});
  return result;
};

mongoHelpers.parseRecords = (records) => {
  if (!records) return [];
  return {count: records.length, records: records}; 
};

module.exports = mongoHelpers;