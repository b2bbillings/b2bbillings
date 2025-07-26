const Task = require("../models/Task");
const Staff = require("../models/Staff");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const {validationResult} = require("express-validator");

// Helper function to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to get company ID from request
const getCompanyId = (req) => {
  return req.companyId || req.user.companyId || req.headers["x-company-id"];
};
// @desc    Create new task assignment
// @route   POST /api/tasks
// @access  Private (Any company user)
const createTask = asyncHandler(async (req, res) => {
  try {
    console.log("🚀 Starting task creation process...");
    console.log("📝 Request body received:", JSON.stringify(req.body, null, 2));

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation errors found:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const companyId = getCompanyId(req);
    const currentUser = req.user;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "COMPANY_REQUIRED",
      });
    }

    const {
      assignedTo,
      taskType,
      customer,
      description,
      dueDate,
      priority,
      reminder,
      estimatedDuration,
      tags,
      isRecurring,
      recurringPattern,
      title,
    } = req.body;

    // Validate required fields
    if (!assignedTo || !taskType || !customer || !description || !dueDate) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: assignedTo, taskType, customer, description, dueDate",
      });
    }

    // Verify assigned staff exists and belongs to company
    const assignedStaff = await Staff.findOne({
      _id: assignedTo,
      companyId: companyId,
      isActive: true,
    });

    if (!assignedStaff) {
      return res.status(404).json({
        success: false,
        message: "Assigned staff member not found or inactive",
      });
    }

    // Process customer data
    let customerData;
    if (typeof customer === "string") {
      customerData = {name: customer};
    } else {
      customerData = {
        name: customer.name || customer,
        customerId: customer.customerId || null,
        contactNumber: customer.contactNumber || customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
      };
    }

    // Process reminder data
    const reminderData = {
      enabled: reminder?.enabled !== false,
      reminderTime: reminder?.reminderTime || "09:00",
      frequency: reminder?.frequency || "once",
      notificationMethods: {
        email: reminder?.notificationMethods?.email !== false,
        sms: reminder?.notificationMethods?.sms !== false,
        app: reminder?.notificationMethods?.app || false,
        whatsapp: reminder?.notificationMethods?.whatsapp || false,
      },
    };

    // ✅ Generate unique taskId
    const generateTaskId = async () => {
      try {
        const company = await Company.findById(companyId);
        const companyPrefix =
          company?.name?.substring(0, 3).toUpperCase() || "TSK";

        // Count existing tasks for this company to get next number
        const taskCount = await Task.countDocuments({companyId: companyId});
        const taskNumber = String(taskCount + 1).padStart(4, "0");

        // Create taskId with format: COMPANY-TASK-0001
        const taskId = `${companyPrefix}-TASK-${taskNumber}`;

        // Check if this taskId already exists (very unlikely but safe)
        const existingTask = await Task.findOne({
          taskId: taskId,
          companyId: companyId,
        });

        if (existingTask) {
          // If collision, add timestamp
          const timestamp = Date.now().toString().slice(-4);
          return `${companyPrefix}-TASK-${taskNumber}-${timestamp}`;
        }

        return taskId;
      } catch (error) {
        console.error("Error generating task ID:", error);
        // Fallback: use timestamp-based ID
        const timestamp = Date.now().toString();
        return `TSK-${timestamp}`;
      }
    };

    const taskId = await generateTaskId();
    console.log("✅ Generated task ID:", taskId);

    // Create task data
    const taskData = {
      taskId: taskId, // ✅ Add the generated taskId
      companyId: companyId,
      assignedTo: assignedTo,
      assignedBy: currentUser._id || currentUser.id,
      assignmentDate: new Date(),
      dueDate: new Date(dueDate),
      title: title || `${taskType}: ${customerData.name}`,
      taskType: taskType,
      description: description,
      customer: customerData,
      priority: priority || "medium",
      reminder: reminderData,
      metrics: {
        estimatedDuration: estimatedDuration || null,
      },
      tags: tags || [],
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? recurringPattern : undefined,
    };

    console.log("💾 Task data to be saved:", JSON.stringify(taskData, null, 2));

    // Create task
    const task = new Task(taskData);
    await task.save();

    console.log("✅ Task saved successfully with ID:", task._id);
    console.log("✅ Task saved successfully with taskId:", task.taskId);

    // Update staff assigned tasks count
    await Staff.findByIdAndUpdate(assignedTo, {
      $inc: {"performance.totalTasksAssigned": 1},
      $push: {
        assignedTasks: {
          taskId: task._id,
          assignedDate: new Date(),
          status: "pending",
        },
      },
    });

    // Populate task for response
    await task.populate([
      {path: "assignedTo", select: "name employeeId role email mobileNumbers"},
      {path: "assignedBy", select: "name employeeId role"},
      {path: "customer.customerId", select: "name email phone"},
    ]);

    console.log("🎉 Task creation completed successfully");

    res.status(201).json({
      success: true,
      message: "Task assigned successfully",
      data: task,
    });
  } catch (error) {
    console.error("❌ Create task error:", error);
    console.error("❌ Error stack:", error.stack);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate task ID generated",
        error: "Please try again",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating task",
      error: error.message,
    });
  }
});

// @desc    Get all tasks for company with filters
// @route   GET /api/tasks
// @access  Private (Any company user)
const getAllTasks = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      assignedTo,
      status,
      priority,
      taskType,
      search,
      sortBy = "dueDate",
      sortOrder = "asc",
      dateFrom,
      dateTo,
      overdue,
    } = req.query;

    const companyId = getCompanyId(req);

    // Build query
    const query = {
      companyId: companyId,
      isActive: true,
    };

    // Apply filters
    if (assignedTo && assignedTo !== "all") query.assignedTo = assignedTo;
    if (status && status !== "all") query.status = status;
    if (priority && priority !== "all") query.priority = priority;
    if (taskType && taskType !== "all") query.taskType = taskType;

    // Date range filter
    if (dateFrom || dateTo) {
      query.dueDate = {};
      if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
      if (dateTo) query.dueDate.$lte = new Date(dateTo);
    }

    // Overdue filter
    if (overdue === "true") {
      query.dueDate = {$lt: new Date()};
      query.status = {$nin: ["completed", "cancelled"]};
    }

    // Search functionality
    if (search) {
      query.$or = [
        {title: {$regex: search, $options: "i"}},
        {description: {$regex: search, $options: "i"}},
        {"customer.name": {$regex: search, $options: "i"}},
        {taskId: {$regex: search, $options: "i"}},
        {tags: {$regex: search, $options: "i"}},
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    if (sortBy === "priority") {
      // Custom priority sorting
      sortOptions.priorityWeight = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    // Get tasks with pagination
    const [tasks, totalCount] = await Promise.all([
      Task.find(query)
        .populate("assignedTo", "name employeeId role email mobileNumbers")
        .populate("assignedBy", "name employeeId role")
        .populate("customer.customerId", "name email phone")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Task.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: "Tasks retrieved successfully",
      data: tasks,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Get all tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tasks",
      error: error.message,
    });
  }
});

// @desc    Get today's tasks
// @route   GET /api/tasks/today
// @access  Private (Any company user)
const getTodaysTasks = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {assignedTo} = req.query;

    const tasks = await Task.getTodaysTasks(companyId, assignedTo);

    res.status(200).json({
      success: true,
      message: "Today's tasks retrieved successfully",
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("Get today's tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching today's tasks",
      error: error.message,
    });
  }
});

// @desc    Get overdue tasks
// @route   GET /api/tasks/overdue
// @access  Private (Any company user)
const getOverdueTasks = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {assignedTo} = req.query;

    const tasks = await Task.getOverdueTasks(companyId, assignedTo);

    res.status(200).json({
      success: true,
      message: "Overdue tasks retrieved successfully",
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("Get overdue tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching overdue tasks",
      error: error.message,
    });
  }
});

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private (Any company user)
const getTaskById = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    })
      .populate("assignedTo", "name employeeId role email mobileNumbers")
      .populate("assignedBy", "name employeeId role")
      .populate("customer.customerId", "name email phone address")
      .populate("parentTask", "title taskId")
      .populate("subTasks", "title taskId status progress.percentage")
      .populate("progress.notes.addedBy", "name employeeId");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task retrieved successfully",
      data: task,
    });
  } catch (error) {
    console.error("Get task by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching task",
      error: error.message,
    });
  }
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private (Any company user)
const updateTask = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const updateData = {...req.body};

    // If changing assigned staff, verify new staff exists
    if (
      updateData.assignedTo &&
      updateData.assignedTo !== task.assignedTo.toString()
    ) {
      const newAssignedStaff = await Staff.findOne({
        _id: updateData.assignedTo,
        companyId: companyId,
        isActive: true,
      });

      if (!newAssignedStaff) {
        return res.status(404).json({
          success: false,
          message: "New assigned staff member not found",
        });
      }

      // Update old staff task count
      await Staff.findByIdAndUpdate(task.assignedTo, {
        $inc: {"performance.totalTasksAssigned": -1},
      });

      // Update new staff task count
      await Staff.findByIdAndUpdate(updateData.assignedTo, {
        $inc: {"performance.totalTasksAssigned": 1},
      });
    }

    // Update task
    Object.keys(updateData).forEach((key) => {
      if (key !== "_id" && key !== "companyId" && key !== "taskId") {
        if (typeof updateData[key] === "object" && updateData[key] !== null) {
          task[key] = {...task[key], ...updateData[key]};
        } else {
          task[key] = updateData[key];
        }
      }
    });

    await task.save();

    // Populate updated task
    await task.populate([
      {path: "assignedTo", select: "name employeeId role email"},
      {path: "assignedBy", select: "name employeeId role"},
    ]);

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating task",
      error: error.message,
    });
  }
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Any company user)
const deleteTask = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;
    const {permanent} = req.query;
    const {reason} = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (permanent === "true") {
      // Hard delete
      await Task.findByIdAndDelete(task._id);

      // Update staff task count
      await Staff.findByIdAndUpdate(task.assignedTo, {
        $inc: {"performance.totalTasksAssigned": -1},
      });

      res.status(200).json({
        success: true,
        message: "Task permanently deleted successfully",
        data: {deletedId: task._id, permanent: true},
      });
    } else {
      // Soft delete
      task.isActive = false;
      task.status = "cancelled";
      task.deletedAt = new Date();
      task.deletedBy = currentUser._id || currentUser.id;
      task.deletionReason = reason || "No reason provided";

      await task.save();

      res.status(200).json({
        success: true,
        message: "Task deleted successfully",
        data: {deletedId: task._id, permanent: false},
      });
    }
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting task",
      error: error.message,
    });
  }
});

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private (Any company user)
const updateTaskStatus = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {status, resultData} = req.body;

    if (
      !["pending", "in-progress", "completed", "delayed", "cancelled"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Update status using instance method for completed tasks
    if (status === "completed") {
      await task.markAsCompleted(resultData || {});

      // Update staff completed tasks count
      await Staff.findByIdAndUpdate(task.assignedTo, {
        $inc: {"performance.totalTasksCompleted": 1},
      });
    } else if (status === "in-progress") {
      await task.markAsStarted();
    } else {
      task.status = status;
      await task.save();
    }

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: {
        taskId: task._id,
        status: task.status,
        progress: task.progress.percentage,
      },
    });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating task status",
      error: error.message,
    });
  }
});

// @desc    Update task progress
// @route   PUT /api/tasks/:id/progress
// @access  Private (Any company user)
const updateTaskProgress = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {percentage} = req.body;

    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress percentage must be between 0 and 100",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await task.updateProgress(percentage);

    res.status(200).json({
      success: true,
      message: "Task progress updated successfully",
      data: {
        taskId: task._id,
        progress: task.progress.percentage,
        status: task.status,
      },
    });
  } catch (error) {
    console.error("Update task progress error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating task progress",
      error: error.message,
    });
  }
});

// @desc    Add note to task
// @route   POST /api/tasks/:id/notes
// @access  Private (Any company user)
const addTaskNote = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;
    const {note} = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note content is required",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await task.addNote(note.trim(), currentUser._id || currentUser.id);

    // Populate the added note
    await task.populate("progress.notes.addedBy", "name employeeId");

    res.status(200).json({
      success: true,
      message: "Note added successfully",
      data: task.progress.notes[task.progress.notes.length - 1],
    });
  } catch (error) {
    console.error("Add task note error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding note to task",
      error: error.message,
    });
  }
});

// @desc    Get task statistics
// @route   GET /api/tasks/statistics
// @access  Private (Any company user)
const getTaskStatistics = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {assignedTo, dateFrom, dateTo} = req.query;

    // Build match query for date filter
    let matchQuery = {
      companyId: new mongoose.Types.ObjectId(companyId),
      isActive: true,
    };

    if (assignedTo && assignedTo !== "all") {
      matchQuery.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    if (dateFrom || dateTo) {
      matchQuery.dueDate = {};
      if (dateFrom) matchQuery.dueDate.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.dueDate.$lte = new Date(dateTo);
    }

    // Get overall statistics
    const [stats] = await Task.getTaskStats(companyId, assignedTo);

    // Get tasks by status
    const statusDistribution = await Task.aggregate([
      {$match: matchQuery},
      {$group: {_id: "$status", count: {$sum: 1}}},
      {$sort: {count: -1}},
    ]);

    // Get tasks by priority
    const priorityDistribution = await Task.aggregate([
      {$match: matchQuery},
      {$group: {_id: "$priority", count: {$sum: 1}}},
      {$sort: {count: -1}},
    ]);

    // Get tasks by type
    const typeDistribution = await Task.aggregate([
      {$match: matchQuery},
      {$group: {_id: "$taskType", count: {$sum: 1}}},
      {$sort: {count: -1}},
    ]);

    // Get overdue tasks count
    const overdueCount = await Task.countDocuments({
      companyId: companyId,
      isActive: true,
      dueDate: {$lt: new Date()},
      status: {$nin: ["completed", "cancelled"]},
      ...(assignedTo && assignedTo !== "all" && {assignedTo: assignedTo}),
    });

    // Get tasks due today
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    const todaysTasksCount = await Task.countDocuments({
      companyId: companyId,
      isActive: true,
      dueDate: {$gte: startOfDay, $lte: endOfDay},
      ...(assignedTo && assignedTo !== "all" && {assignedTo: assignedTo}),
    });

    res.status(200).json({
      success: true,
      message: "Task statistics retrieved successfully",
      data: {
        overall: stats || {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          averageProgress: 0,
          totalTimeSpent: 0,
        },
        statusDistribution,
        priorityDistribution,
        typeDistribution,
        overdueCount,
        todaysTasksCount,
      },
    });
  } catch (error) {
    console.error("Get task statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching task statistics",
      error: error.message,
    });
  }
});

// @desc    Bulk assign tasks
// @route   POST /api/tasks/bulk-assign
// @access  Private (Any company user)
const bulkAssignTasks = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;
    const {tasks} = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tasks array is required and cannot be empty",
      });
    }

    // ✅ Helper function to generate taskId for bulk operations
    const generateBulkTaskId = async (index) => {
      try {
        const company = await Company.findById(companyId);
        const companyPrefix =
          company?.name?.substring(0, 3).toUpperCase() || "TSK";

        const taskCount = await Task.countDocuments({companyId: companyId});
        const taskNumber = String(taskCount + index + 1).padStart(4, "0");

        return `${companyPrefix}-TASK-${taskNumber}`;
      } catch (error) {
        console.error("Error generating bulk task ID:", error);
        const timestamp = Date.now().toString();
        return `TSK-${timestamp}-${index}`;
      }
    };

    const createdTasks = [];
    const errors = [];

    for (let i = 0; i < tasks.length; i++) {
      try {
        const taskData = tasks[i];

        // Verify assigned staff exists
        const assignedStaff = await Staff.findOne({
          _id: taskData.assignedTo,
          companyId: companyId,
          isActive: true,
        });

        if (!assignedStaff) {
          errors.push({
            index: i,
            error: "Assigned staff member not found",
            taskData: taskData,
          });
          continue;
        }

        // Process customer data
        let customerData;
        if (typeof taskData.customer === "string") {
          customerData = {name: taskData.customer};
        } else {
          customerData = {
            name: taskData.customer.name || taskData.customer,
            customerId: taskData.customer.customerId || null,
            contactNumber:
              taskData.customer.contactNumber ||
              taskData.customer.phone ||
              null,
            email: taskData.customer.email || null,
            address: taskData.customer.address || null,
          };
        }

        // ✅ Generate taskId for this bulk task
        const taskId = await generateBulkTaskId(i);

        // Create task
        const task = new Task({
          taskId: taskId, // ✅ Add generated taskId
          companyId: companyId,
          assignedTo: taskData.assignedTo,
          assignedBy: currentUser._id || currentUser.id,
          assignmentDate: new Date(),
          dueDate: new Date(taskData.dueDate),
          title: taskData.title || `${taskData.taskType}: ${customerData.name}`,
          taskType: taskData.taskType,
          description: taskData.description,
          customer: customerData,
          priority: taskData.priority || "medium",
          reminder: {
            enabled: taskData.reminder?.enabled !== false,
            reminderTime: taskData.reminder?.reminderTime || "09:00",
            frequency: taskData.reminder?.frequency || "once",
            notificationMethods: {
              email: taskData.reminder?.notificationMethods?.email !== false,
              sms: taskData.reminder?.notificationMethods?.sms !== false,
              app: taskData.reminder?.notificationMethods?.app || false,
              whatsapp:
                taskData.reminder?.notificationMethods?.whatsapp || false,
            },
          },
          tags: taskData.tags || [],
        });

        await task.save();

        // Update staff task count
        await Staff.findByIdAndUpdate(taskData.assignedTo, {
          $inc: {"performance.totalTasksAssigned": 1},
        });

        createdTasks.push(task);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          taskData: tasks[i],
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdTasks.length} tasks${
        errors.length > 0 ? ` with ${errors.length} errors` : ""
      }`,
      data: {
        createdTasks: createdTasks.length,
        totalRequested: tasks.length,
        errors: errors,
      },
    });
  } catch (error) {
    console.error("Bulk assign tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Error bulk assigning tasks",
      error: error.message,
    });
  }
});

// @desc    Get task reminders for today
// @route   GET /api/tasks/reminders
// @access  Private (Any company user)
const getTaskReminders = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {assignedTo} = req.query;

    const now = new Date();
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    const query = {
      companyId: companyId,
      isActive: true,
      "reminder.enabled": true,
      "reminder.reminderDateTime": {
        $gte: now,
        $lte: endOfDay,
      },
      status: {$nin: ["completed", "cancelled"]},
    };

    if (assignedTo && assignedTo !== "all") {
      query.assignedTo = assignedTo;
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name employeeId role email mobileNumbers")
      .populate("assignedBy", "name employeeId role")
      .sort({"reminder.reminderDateTime": 1})
      .lean();

    res.status(200).json({
      success: true,
      message: "Task reminders retrieved successfully",
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("Get task reminders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching task reminders",
      error: error.message,
    });
  }
});

module.exports = {
  createTask,
  getAllTasks,
  getTodaysTasks,
  getOverdueTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskProgress,
  addTaskNote,
  getTaskStatistics,
  bulkAssignTasks,
  getTaskReminders,
};
