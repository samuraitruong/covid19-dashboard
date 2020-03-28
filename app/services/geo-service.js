const logger = require("../logger");
const axios = require("axios").default.create();

const getGeoLocation = async (name) => {
  logger.info("Get geo location details %s", name, {
    location: name
  });
  const url = `http://www.mapquestapi.com/geocoding/v1/address?key=${process.env.MAPQUEST_KEY}&location=${name}`;
  const {
    data
  } = await axios.get(url);
  const latlng = data.results[0].locations[0].latLng;
  logger.info("Map quest response for : %s, %j", name, latlng, {
    data: data.results,
    latlng
  });
  return latlng;
}
module.exports = {
  getGeoLocation
}