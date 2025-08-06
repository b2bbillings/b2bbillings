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
  return req.companyId || req.user?.companyId || req.headers["x-company-id"];
};

// Enhanced error handler
const handleError = (error, req, res, operation) => {
  let statusCode = 500;
  let message = "Internal server error";

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    const validationErrors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
    return res.status(statusCode).json({
      success: false,
      message,
      errors: validationErrors,
    });
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate data detected";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid data format";
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

// Generate unique task ID
const generateTaskId = async (companyId, index = 0) => {
  try {
    const company = await Company.findById(companyId);
    const companyPrefix = company?.name?.substring(0, 3).toUpperCase() || "TSK";
    const taskCount = await Task.countDocuments({companyId});
    const taskNumber = String(taskCount + index + 1).padStart(4, "0");
    const taskId = `${companyPrefix}-TASK-${taskNumber}`;

    const existingTask = await Task.findOne({taskId, companyId});
    if (existingTask) {
      const timestamp = Date.now().toString().slice(-4);
      return `${companyPrefix}-TASK-${taskNumber}-${timestamp}`;
    }

    return taskId;
  } catch (error) {
    const timestamp = Date.now().toString();
    return `TSK-${timestamp}${index ? `-${index}` : ""}`;
  }
};

// Process customer data helper
const processCustomerData = (customer) => {
  if (typeof customer === "string") {
    return {name: customer};
  }
  return {
    name: customer.name || customer,
    customerId: customer.customerId || null,
    contactNumber: customer.contactNumber || customer.phone || null,
    email: customer.email || null,
    address: customer.address || null,
  };
};

// Process reminder data helper
const processReminderData = (reminder) => {
  return {
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
};

// @desc    Create new task assignment
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

    // Basic validation
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
      companyId,
      isActive: true,
    });

    if (!assignedStaff) {
      return res.status(404).json({
        success: false,
        message: "Assigned staff member not found or inactive",
      });
    }

    const customerData = processCustomerData(customer);
    const reminderData = processReminderData(reminder);
    const taskId = await generateTaskId(companyId);

    const taskData = {
      taskId,
      companyId,
      assignedTo,
      assignedBy: currentUser._id || currentUser.id,
      assignmentDate: new Date(),
      dueDate: new Date(dueDate),
      title: title || `${taskType}: ${customerData.name}`,
      taskType,
      description,
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

    const task = new Task(taskData);
    await task.save();

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

    res.status(201).json({
      success: true,
      message: "Task assigned successfully",
      data: task,
    });
  } catch (error) {
    handleError(error, req, res, "createTask");
  }
});

// @desc    Get all tasks for company with filters
// @route   GET /api/tasks
// @access  Private
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
      companyId,
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
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      query.$or = [
        {title: searchRegex},
        {description: searchRegex},
        {"customer.name": searchRegex},
        {taskId: searchRegex},
        {tags: searchRegex},
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    if (sortBy === "priority") {
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

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "Tasks retrieved successfully",
      data: tasks,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    handleError(error, req, res, "getAllTasks");
  }
});

// @desc    Get today's tasks
// @route   GET /api/tasks/today
// @access  Private
const getTodaysTasks = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {assignedTo} = req.query;

    let tasks;
    if (Task.getTodaysTasks) {
      tasks = await Task.getTodaysTasks(companyId, assignedTo);
    } else {
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

      const query = {
        companyId,
        isActive: true,
        dueDate: {$gte: startOfDay, $lte: endOfDay},
      };

      if (assignedTo && assignedTo !== "all") {
        query.assignedTo = assignedTo;
      }

      tasks = await Task.find(query)
        .populate("assignedTo", "name employeeId role")
        .populate("assignedBy", "name employeeId role")
        .sort({dueDate: 1})
        .lean();
    }

    res.status(200).json({
      success: true,
      message: "Today's tasks retrieved successfully",
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    handleError(error, req, res, "getTodaysTasks");
  }
});

// @desc    Get overdue tasks
// @route   GET /api/tasks/overdue
// @access  Private
const getOverdueTasks = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {assignedTo} = req.query;

    let tasks;
    if (Task.getOverdueTasks) {
      tasks = await Task.getOverdueTasks(companyId, assignedTo);
    } else {
      const query = {
        companyId,
        isActive: true,
        dueDate: {$lt: new Date()},
        status: {$nin: ["completed", "cancelled"]},
      };

      if (assignedTo && assignedTo !== "all") {
        query.assignedTo = assignedTo;
      }

      tasks = await Task.find(query)
        .populate("assignedTo", "name employeeId role")
        .populate("assignedBy", "name employeeId role")
        .sort({dueDate: 1})
        .lean();
    }

    res.status(200).json({
      success: true,
      message: "Overdue tasks retrieved successfully",
      data: tasks,
      count: tasks.length,
    });
  } catch (error) {
    handleError(error, req, res, "getOverdueTasks");
  }
});

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const task = await Task.findOne({
      _id: req.params.id,
      companyId,
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
    handleError(error, req, res, "getTaskById");
  }
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;

    const task = await Task.findOne({
      _id: req.params.id,
      companyId,
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
        companyId,
        isActive: true,
      });

      if (!newAssignedStaff) {
        return res.status(404).json({
          success: false,
          message: "New assigned staff member not found",
        });
      }

      // Update staff task counts
      await Promise.all([
        Staff.findByIdAndUpdate(task.assignedTo, {
          $inc: {"performance.totalTasksAssigned": -1},
        }),
        Staff.findByIdAndUpdate(updateData.assignedTo, {
          $inc: {"performance.totalTasksAssigned": 1},
        }),
      ]);
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
    handleError(error, req, res, "updateTask");
  }
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;
    const {permanent} = req.query;
    const {reason} = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (permanent === "true") {
      await Task.findByIdAndDelete(task._id);
      await Staff.findByIdAndUpdate(task.assignedTo, {
        $inc: {"performance.totalTasksAssigned": -1},
      });

      res.status(200).json({
        success: true,
        message: "Task permanently deleted successfully",
        data: {deletedId: task._id, permanent: true},
      });
    } else {
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
    handleError(error, req, res, "deleteTask");
  }
});

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
const updateTaskStatus = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const {status, resultData} = req.body;

    const validStatuses = [
      "pending",
      "in-progress",
      "completed",
      "delayed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Update status using instance methods for specific statuses
    if (status === "completed") {
      if (task.markAsCompleted) {
        await task.markAsCompleted(resultData || {});
      } else {
        task.status = "completed";
        task.progress.percentage = 100;
        task.progress.completedAt = new Date();
        await task.save();
      }

      await Staff.findByIdAndUpdate(task.assignedTo, {
        $inc: {"performance.totalTasksCompleted": 1},
      });
    } else if (status === "in-progress") {
      if (task.markAsStarted) {
        await task.markAsStarted();
      } else {
        task.status = "in-progress";
        task.progress.startedAt = new Date();
        await task.save();
      }
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
    handleError(error, req, res, "updateTaskStatus");
  }
});

// @desc    Update task progress
// @route   PUT /api/tasks/:id/progress
// @access  Private
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
      companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (task.updateProgress) {
      await task.updateProgress(percentage);
    } else {
      task.progress.percentage = percentage;
      task.progress.lastUpdated = new Date();

      if (percentage === 100) {
        task.status = "completed";
        task.progress.completedAt = new Date();
      } else if (percentage > 0 && task.status === "pending") {
        task.status = "in-progress";
        task.progress.startedAt = new Date();
      }

      await task.save();
    }

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
    handleError(error, req, res, "updateTaskProgress");
  }
});

// @desc    Add note to task
// @route   POST /api/tasks/:id/notes
// @access  Private
const addTaskNote = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const currentUser = req.user;
    const {note} = req.body;

    if (!note?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note content is required",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId,
      isActive: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (task.addNote) {
      await task.addNote(note.trim(), currentUser._id || currentUser.id);
    } else {
      if (!task.progress.notes) {
        task.progress.notes = [];
      }

      task.progress.notes.push({
        note: note.trim(),
        addedBy: currentUser._id || currentUser.id,
        addedAt: new Date(),
      });

      await task.save();
    }

    await task.populate("progress.notes.addedBy", "name employeeId");

    res.status(200).json({
      success: true,
      message: "Note added successfully",
      data: task.progress.notes[task.progress.notes.length - 1],
    });
  } catch (error) {
    handleError(error, req, res, "addTaskNote");
  }
});

// @desc    Get task statistics
// @route   GET /api/tasks/statistics
// @access  Private
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
    let stats;
    if (Task.getTaskStats) {
      [stats] = await Task.getTaskStats(companyId, assignedTo);
    } else {
      const totalTasks = await Task.countDocuments(matchQuery);
      const completedTasks = await Task.countDocuments({
        ...matchQuery,
        status: "completed",
      });
      const pendingTasks = await Task.countDocuments({
        ...matchQuery,
        status: "pending",
      });
      const inProgressTasks = await Task.countDocuments({
        ...matchQuery,
        status: "in-progress",
      });

      stats = {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks: 0,
        completionRate:
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        averageProgress: 0,
        totalTimeSpent: 0,
      };
    }

    // Get distribution data
    const [statusDistribution, priorityDistribution, typeDistribution] =
      await Promise.all([
        Task.aggregate([
          {$match: matchQuery},
          {$group: {_id: "$status", count: {$sum: 1}}},
          {$sort: {count: -1}},
        ]),
        Task.aggregate([
          {$match: matchQuery},
          {$group: {_id: "$priority", count: {$sum: 1}}},
          {$sort: {count: -1}},
        ]),
        Task.aggregate([
          {$match: matchQuery},
          {$group: {_id: "$taskType", count: {$sum: 1}}},
          {$sort: {count: -1}},
        ]),
      ]);

    // Get additional counts
    const overdueCount = await Task.countDocuments({
      companyId,
      isActive: true,
      dueDate: {$lt: new Date()},
      status: {$nin: ["completed", "cancelled"]},
      ...(assignedTo && assignedTo !== "all" && {assignedTo}),
    });

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
      companyId,
      isActive: true,
      dueDate: {$gte: startOfDay, $lte: endOfDay},
      ...(assignedTo && assignedTo !== "all" && {assignedTo}),
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
    handleError(error, req, res, "getTaskStatistics");
  }
});

// @desc    Bulk assign tasks
// @route   POST /api/tasks/bulk-assign
// @access  Private
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

    if (tasks.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 tasks can be created at once",
      });
    }

    const createdTasks = [];
    const errors = [];

    for (let i = 0; i < tasks.length; i++) {
      try {
        const taskData = tasks[i];

        // Verify assigned staff exists
        const assignedStaff = await Staff.findOne({
          _id: taskData.assignedTo,
          companyId,
          isActive: true,
        });

        if (!assignedStaff) {
          errors.push({
            index: i,
            error: "Assigned staff member not found",
            taskData,
          });
          continue;
        }

        const customerData = processCustomerData(taskData.customer);
        const taskId = await generateTaskId(companyId, i);

        // Create task
        const task = new Task({
          taskId,
          companyId,
          assignedTo: taskData.assignedTo,
          assignedBy: currentUser._id || currentUser.id,
          assignmentDate: new Date(),
          dueDate: new Date(taskData.dueDate),
          title: taskData.title || `${taskData.taskType}: ${customerData.name}`,
          taskType: taskData.taskType,
          description: taskData.description,
          customer: customerData,
          priority: taskData.priority || "medium",
          reminder: processReminderData(taskData.reminder),
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
        errors,
      },
    });
  } catch (error) {
    handleError(error, req, res, "bulkAssignTasks");
  }
});

// @desc    Get task reminders for today
// @route   GET /api/tasks/reminders
// @access  Private
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
      companyId,
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
    handleError(error, req, res, "getTaskReminders");
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
