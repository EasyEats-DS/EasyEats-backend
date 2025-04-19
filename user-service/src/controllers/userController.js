const User = require('../models/userModel');

exports.createUser = async (userData) => {
  try {
    const { name, email, address } = userData;
    
    if (!name || !email) {
      const error = new Error('Name and email are required');
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
    
    // Create new user with address (if provided)
    const user = new User({
      name,
      email,
      address: address ? {  // Only include address if provided
        street: address.street || null,
        city: address.city || null,
        state: address.state || null,
        zipCode: address.zipCode || null,
        country: address.country || null
      } : undefined
    });
    
    const savedUser = await user.save();
    // console.log('User saved successfully:', savedUser);

    // Verify the user was actually saved
    const verifiedUser = await User.findById(savedUser._id);
    if (!verifiedUser) {
      console.error('User was not found in DB after save:', savedUser._id);
      throw new Error('Failed to persist user in database');
    }
    return savedUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

exports.getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    
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
}
exports.updateUserById = async (userId, userData) => {
  try {
    const { name, email, address } = userData;
    
    if (!name || !email) {
      const error = new Error('Name and email are required');
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
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, userData, { new: true });
    
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
    
    const users = await User.find().skip(skip).limit(limit).lean();
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
