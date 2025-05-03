const User = require('../models/userModel');
const bcrypt = require('bcrypt');

exports.createUser = async (userData) => {
  try {
    const { firstName, lastName, email, password, address, role, phoneNumber } = userData;

    // Validation
    if (!firstName || !lastName || !email || !password || !role || !phoneNumber) {
      const error = new Error('First name, last name, email, role, password, and phone number are required');
      error.statusCode = 400;
      throw error;
    }

    // let location = [0, 0]; // Default location if not provided
    // location[0] = parseFloat(position.coordinates[0]);
    // location[1] = parseFloat(position.coordinates[1]);
    // console.log('Parsed position:', location);

    // Validate role
    const validRoles = ['RESTAURANT_OWNER', 'DELIVERY_PERSON','CUSTOMER','SUPER_ADMIN']
    if (!validRoles.includes(role)) {
      const error = new Error('Invalid user role');
      error.statusCode = 400;
      throw error;
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);


    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      phoneNumber,
      address: address ? {
        street: address.street || null,
        city: address.city || null,
        state: address.state || null,
        zipCode: address.zipCode || null,
        country: address.country || null
      } : undefined,
    });
    console.log('User object before saving:', user);

    const savedUser = await user.save();
    console.log('User saved successfully:', savedUser);
    
    // Verify the user was actually saved
    const verifiedUser = await User.findById(savedUser._id);
    if (!verifiedUser) {
      console.error('User was not found in DB after save:', savedUser._id);
      throw new Error('Failed to persist user in database');
    }
    
    // Don't return password in the response
    const userResponse = savedUser;
    // delete userResponse.password;
    
    return userResponse;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

exports.getUserById = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    return { user };
  } catch (error) {
    console.error('Error fetching user:', error);  
    throw error;
  }
};

exports.deleteUserById = async (userId) => {
  try {
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    return { message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

exports.updateUserById = async (userId, userData) => {
  try {
    const { firstName, lastName, email, password, address } = userData;
    
    if (!firstName || !lastName || !email) {
      const error = new Error('First name, last name and email are required');
      error.statusCode = 400;
      throw error;
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser && existingUser._id.toString() !== userId) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }
    
    // Prepare update data
    const updateData = {
      firstName,
      lastName,
      email,
      address: address ? {
        street: address.street || null,
        city: address.city || null,
        state: address.state || null,
        zipCode: address.zipCode || null,
        country: address.country || null
      } : undefined
    };
    
    // Update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    
    if (!updatedUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

exports.getUsers = async (query) => {
  try {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const users = await User.find().select('-password').skip(skip).limit(limit).lean();
    const totalUsers = await User.countDocuments();
    
    return {
      success: true,
      data: {
        users,
        pagination: {
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: page,
          limit
        }
      }
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw {
      statusCode: 500,
      message: 'Failed to fetch users',
      details: error.message
    };
  }
};
exports.getNearbyDrivers = async (location) => {
  console.log('Fetching nearby drivers for location:', location);
  try{
    const  coordinates  = location.location;
    console.log('Coordinates for nearby drivers:', coordinates);
    const nearbyDrivers = await User.find({
      position: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
          },
          $maxDistance: 5000 // 5 km radius
        }
      },
      role: 'DELIVERY_PERSON' // Assuming you have a role field to identify drivers
    }).select('-password');

    return nearbyDrivers;
  }catch (error) {
    console.error('Error fetching nearby drivers:', error);
    throw error;
  }
}

exports.updateLocation =  async (location,customerId) =>{
  console.log('Updating customer location:', location, customerId);
  const loc = [location.latitude, location.longitude];
  try {
    const customer = await User.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    //console.log("Customer  ___________pre",customer);
    customer.position.coordinates = loc;
    //console.log("Customer  ___________post",customer);
    await customer.save();
    return customer;
  } catch (err) {
    console.error("Error updating customer location:", err.message);
    throw new Error('Server error');
  }
}
