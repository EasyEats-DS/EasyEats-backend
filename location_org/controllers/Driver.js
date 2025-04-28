// const Driver = require('../models/Driver');

// exports.updateDriverLocation = async (location,driverId) => {
//     try {
//         const driver = await Driver.findById(driverId);
//         if (!driver) {
//           return res.status(404).json({ message: 'Driver not found' });
//         }
//         console.log("Driver  ___________pre",driver);
//         driver.position.coordinates = location;
//         console.log("Driver  ___________post",driver);
//         await driver.save();
//         return driver;
//       } catch (err) {
//         console.error('Error updating driver location:', err);
//         throw err;
//       }
// }

// exports.getNearbyDrivers = async (location) => {
//   console.log("location",location);
//     try {
//       const drivers = await Driver.find({
//         position: {
//           $near: {
//             $geometry: location,
//             $maxDistance: 5000  // optional: meters
//           }
//         }
//       });        console.log("drivers",drivers);
//         return drivers;
//       } catch (err) {
//         console.error('Error fetching nearby drivers:', err);
//         throw err;
//       }
// }