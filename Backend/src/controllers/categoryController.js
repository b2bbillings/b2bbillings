const { Category, SubCategory } = require('../models/Category');
const mongoose = require('mongoose');

// Category Controllers

// Get all active categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.getActiveCategories();
    
    res.status(200).json({
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error.message
    });
  }
};

// Get category by ID with sub-categories
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }
    
    const category = await Category.getCategoryWithSubCategories(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Category retrieved successfully',
      data: category
    });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category',
      error: error.message
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id || req.user?._id;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: name.trim(), 
      isActive: true 
    });
    
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    const newCategory = new Category({
      name: name.trim(),
      description: description?.trim(),
      createdBy: userId,
      updatedBy: userId
    });
    
    const savedCategory = await newCategory.save();
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: savedCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id || req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const updateData = {
      updatedBy: userId
    };
    
    if (name && name.trim() !== '') {
      updateData.name = name.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim();
    }
    
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: id, isActive: true },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// Delete category (soft delete)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    // Check if category has active sub-categories
    const hasSubCategories = await SubCategory.findOne({
      parentCategory: id,
      isActive: true
    });
    
    if (hasSubCategories) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active sub-categories'
      });
    }
    
    const deletedCategory = await Category.findOneAndUpdate(
      { _id: id, isActive: true },
      { 
        isActive: false, 
        updatedBy: userId 
      },
      { new: true }
    );
    
    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      data: deletedCategory
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

// SubCategory Controllers

// Get all active sub-categories
const getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.getActiveSubCategories();
    
    res.status(200).json({
      success: true,
      message: 'Sub-categories retrieved successfully',
      data: subCategories,
      count: subCategories.length
    });
  } catch (error) {
    console.error('Error getting sub-categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-categories',
      error: error.message
    });
  }
};

// Get sub-categories by parent category
const getSubCategoriesByParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parent category ID'
      });
    }
    
    const subCategories = await SubCategory.getSubCategoriesByParent(parentId);
    
    res.status(200).json({
      success: true,
      message: 'Sub-categories retrieved successfully',
      data: subCategories,
      count: subCategories.length
    });
  } catch (error) {
    console.error('Error getting sub-categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sub-categories',
      error: error.message
    });
  }
};

// Create new sub-category
const createSubCategory = async (req, res) => {
  try {
    const { name, parentCategory, description } = req.body;
    const userId = req.user?.id || req.user?._id;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Sub-category name is required'
      });
    }
    
    if (!parentCategory) {
      return res.status(400).json({
        success: false,
        message: 'Parent category is required'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(parentCategory)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parent category ID'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    // Check if parent category exists and is active
    const parentCategoryExists = await Category.findOne({
      _id: parentCategory,
      isActive: true
    });
    
    if (!parentCategoryExists) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found or inactive'
      });
    }
    
    // Check if sub-category with same name exists in the same parent category
    const existingSubCategory = await SubCategory.findOne({
      name: name.trim(),
      parentCategory: parentCategory,
      isActive: true
    });
    
    if (existingSubCategory) {
      return res.status(409).json({
        success: false,
        message: 'Sub-category with this name already exists in the selected category'
      });
    }
    
    const newSubCategory = new SubCategory({
      name: name.trim(),
      parentCategory,
      description: description?.trim(),
      createdBy: userId,
      updatedBy: userId
    });
    
    const savedSubCategory = await newSubCategory.save();
    await savedSubCategory.populate('parentCategory', 'name');
    
    res.status(201).json({
      success: true,
      message: 'Sub-category created successfully',
      data: savedSubCategory
    });
  } catch (error) {
    console.error('Error creating sub-category:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Sub-category with this name already exists in the selected category'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create sub-category',
      error: error.message
    });
  }
};

// Update sub-category
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentCategory, description } = req.body;
    const userId = req.user?.id || req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sub-category ID'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const updateData = {
      updatedBy: userId
    };
    
    if (name && name.trim() !== '') {
      updateData.name = name.trim();
    }
    
    if (parentCategory && mongoose.Types.ObjectId.isValid(parentCategory)) {
      // Check if parent category exists and is active
      const parentCategoryExists = await Category.findOne({
        _id: parentCategory,
        isActive: true
      });
      
      if (!parentCategoryExists) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found or inactive'
        });
      }
      
      updateData.parentCategory = parentCategory;
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim();
    }
    
    const updatedSubCategory = await SubCategory.findOneAndUpdate(
      { _id: id, isActive: true },
      updateData,
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name');
    
    if (!updatedSubCategory) {
      return res.status(404).json({
        success: false,
        message: 'Sub-category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Sub-category updated successfully',
      data: updatedSubCategory
    });
  } catch (error) {
    console.error('Error updating sub-category:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Sub-category with this name already exists in the selected category'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update sub-category',
      error: error.message
    });
  }
};

// Delete sub-category (soft delete)
const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sub-category ID'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }
    
    const deletedSubCategory = await SubCategory.findOneAndUpdate(
      { _id: id, isActive: true },
      { 
        isActive: false, 
        updatedBy: userId 
      },
      { new: true }
    ).populate('parentCategory', 'name');
    
    if (!deletedSubCategory) {
      return res.status(404).json({
        success: false,
        message: 'Sub-category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Sub-category deleted successfully',
      data: deletedSubCategory
    });
  } catch (error) {
    console.error('Error deleting sub-category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-category',
      error: error.message
    });
  }
};

module.exports = {
  // Category controllers
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // SubCategory controllers
  getAllSubCategories,
  getSubCategoriesByParent,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
};