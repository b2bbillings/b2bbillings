const mongoose = require('mongoose');
const TeamChat = require('../models/TeamChat');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Company = require('../models/Company');

// ================================
// 🧪 TEAM CHAT SYSTEM TEST
// ================================

class TeamChatSystemTest {
  constructor() {
    this.testResults = [];
    this.testUsers = [];
    this.testCompany = null;
    this.testChats = [];
  }

  // ================================
  // 🏗️ TEST SETUP
  // ================================

  async setupTestData() {
    console.log('🏗️ Setting up test data...');
    
    try {
      // Create test company
      this.testCompany = await Company.create({
        companyName: 'Test Company for Chat',
        email: 'test@chatcompany.com',
        address: '123 Test Street',
        contactNumber: '1234567890'
      });

      // Create test users
      for (let i = 1; i <= 4; i++) {
        const user = await User.create({
          name: `Test User ${i}`,
          email: `testuser${i}@example.com`,
          password: 'TestPassword123!',
          phone: `123456789${i}`,
          role: i === 1 ? 'admin' : 'user',
          companyId: this.testCompany._id,
          chatProfile: {
            status: 'available',
            statusMessage: `I'm test user ${i}`,
            isOnline: true,
            lastSeen: new Date(),
            notificationSettings: {
              soundEnabled: true,
              desktopNotifications: true,
              emailNotifications: false
            }
          }
        });
        this.testUsers.push(user);
      }

      console.log('✅ Test data setup completed');
      return true;
    } catch (error) {
      console.error('❌ Test data setup failed:', error);
      return false;
    }
  }

  // ================================
  // 🧪 INDIVIDUAL TESTS
  // ================================

  async testTeamChatCreation() {
    console.log('\n🧪 Testing team chat creation...');
    
    try {
      // Test creating a group chat
      const groupChat = await TeamChat.create({
        name: 'Test Group Chat',
        type: 'group',
        participants: [this.testUsers[0]._id, this.testUsers[1]._id, this.testUsers[2]._id],
        createdBy: this.testUsers[0]._id,
        companyId: this.testCompany._id,
        settings: {
          allowNewMembers: true,
          mutedParticipants: []
        }
      });

      // Test creating a direct chat
      const directChat = await TeamChat.createDirectChat(
        this.testUsers[0]._id,
        this.testUsers[3]._id,
        this.testCompany._id
      );

      this.testChats.push(groupChat, directChat);

      this.testResults.push({
        test: 'Team Chat Creation',
        status: 'PASSED',
        details: `Created group chat (${groupChat._id}) and direct chat (${directChat._id})`
      });

      console.log('✅ Team chat creation test passed');
      return true;
    } catch (error) {
      this.testResults.push({
        test: 'Team Chat Creation',
        status: 'FAILED',
        error: error.message
      });
      console.error('❌ Team chat creation test failed:', error);
      return false;
    }
  }

  async testMessageOperations() {
    console.log('\n🧪 Testing message operations...');
    
    try {
      const groupChat = this.testChats[0];
      const directChat = this.testChats[1];

      // Test sending text message
      const textMessage = await ChatMessage.create({
        chatId: groupChat._id,
        sender: this.testUsers[0]._id,
        content: {
          type: 'text',
          text: 'Hello team! This is a test message.'
        },
        timestamp: new Date()
      });

      // Test sending image message
      const imageMessage = await ChatMessage.create({
        chatId: groupChat._id,
        sender: this.testUsers[1]._id,
        content: {
          type: 'image',
          text: 'Check out this image',
          fileUrl: '/uploads/test-image.jpg',
          fileName: 'test-image.jpg',
          fileSize: 1024000
        },
        timestamp: new Date()
      });

      // Test message reactions
      await textMessage.addReaction(this.testUsers[1]._id, '👍');
      await textMessage.addReaction(this.testUsers[2]._id, '❤️');

      // Test marking message as read
      await textMessage.markAsRead(this.testUsers[1]._id);
      await textMessage.markAsRead(this.testUsers[2]._id);

      // Test direct chat message
      const directMessage = await ChatMessage.create({
        chatId: directChat._id,
        sender: this.testUsers[0]._id,
        content: {
          type: 'text',
          text: 'Hey there! Private message test.'
        },
        timestamp: new Date()
      });

      this.testResults.push({
        test: 'Message Operations',
        status: 'PASSED',
        details: `Created ${3} messages with reactions and read receipts`
      });

      console.log('✅ Message operations test passed');
      return true;
    } catch (error) {
      this.testResults.push({
        test: 'Message Operations',
        status: 'FAILED',
        error: error.message
      });
      console.error('❌ Message operations test failed:', error);
      return false;
    }
  }

  async testParticipantManagement() {
    console.log('\n🧪 Testing participant management...');
    
    try {
      const groupChat = this.testChats[0];

      // Test adding participant
      await groupChat.addParticipant(this.testUsers[3]._id);

      // Test removing participant
      await groupChat.removeParticipant(this.testUsers[2]._id);

      // Verify participant changes
      const updatedChat = await TeamChat.findById(groupChat._id);
      const hasNewParticipant = updatedChat.participants.includes(this.testUsers[3]._id);
      const removedParticipant = !updatedChat.participants.includes(this.testUsers[2]._id);

      if (hasNewParticipant && removedParticipant) {
        this.testResults.push({
          test: 'Participant Management',
          status: 'PASSED',
          details: 'Successfully added and removed participants'
        });
        console.log('✅ Participant management test passed');
        return true;
      } else {
        throw new Error('Participant changes not reflected correctly');
      }
    } catch (error) {
      this.testResults.push({
        test: 'Participant Management',
        status: 'FAILED',
        error: error.message
      });
      console.error('❌ Participant management test failed:', error);
      return false;
    }
  }

  async testChatQueries() {
    console.log('\n🧪 Testing chat queries...');
    
    try {
      // Test finding user chats
      const userChats = await TeamChat.findUserChats(this.testUsers[0]._id);
      
      // Test getting chat messages
      const groupChat = this.testChats[0];
      const messages = await ChatMessage.getChatMessages(groupChat._id, 1, 10);

      // Test chat statistics
      const chatStats = await TeamChat.aggregate([
        { $match: { companyId: this.testCompany._id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalParticipants: { $sum: { $size: '$participants' } }
          }
        }
      ]);

      this.testResults.push({
        test: 'Chat Queries',
        status: 'PASSED',
        details: `Found ${userChats.length} user chats, ${messages.length} messages, chat stats generated`
      });

      console.log('✅ Chat queries test passed');
      return true;
    } catch (error) {
      this.testResults.push({
        test: 'Chat Queries',
        status: 'FAILED',
        error: error.message
      });
      console.error('❌ Chat queries test failed:', error);
      return false;
    }
  }

  async testUserProfileUpdates() {
    console.log('\n🧪 Testing user profile updates...');
    
    try {
      const testUser = this.testUsers[0];

      // Test updating chat profile
      testUser.chatProfile.status = 'busy';
      testUser.chatProfile.statusMessage = 'In a meeting';
      await testUser.save();

      // Test updating notification settings
      testUser.chatProfile.notificationSettings.soundEnabled = false;
      testUser.chatProfile.notificationSettings.desktopNotifications = false;
      await testUser.save();

      // Test blocking user
      testUser.chatProfile.blockedUsers.push(this.testUsers[3]._id);
      await testUser.save();

      // Verify updates
      const updatedUser = await User.findById(testUser._id);
      const profileUpdated = updatedUser.chatProfile.status === 'busy';
      const settingsUpdated = !updatedUser.chatProfile.notificationSettings.soundEnabled;
      const userBlocked = updatedUser.chatProfile.blockedUsers.includes(this.testUsers[3]._id);

      if (profileUpdated && settingsUpdated && userBlocked) {
        this.testResults.push({
          test: 'User Profile Updates',
          status: 'PASSED',
          details: 'Profile, settings, and blocked users updated successfully'
        });
        console.log('✅ User profile updates test passed');
        return true;
      } else {
        throw new Error('Profile updates not saved correctly');
      }
    } catch (error) {
      this.testResults.push({
        test: 'User Profile Updates',
        status: 'FAILED',
        error: error.message
      });
      console.error('❌ User profile updates test failed:', error);
      return false;
    }
  }

  async testSystemMessages() {
    console.log('\n🧪 Testing system messages...');
    
    try {
      const groupChat = this.testChats[0];

      // Test system message for user joined
      const joinMessage = await ChatMessage.createSystemMessage(
        groupChat._id,
        'user_joined',
        `${this.testUsers[3].name} joined the chat`,
        { userId: this.testUsers[3]._id }
      );

      // Test system message for user left
      const leaveMessage = await ChatMessage.createSystemMessage(
        groupChat._id,
        'user_left',
        `${this.testUsers[2].name} left the chat`,
        { userId: this.testUsers[2]._id }
      );

      // Test system message for chat updated
      const updateMessage = await ChatMessage.createSystemMessage(
        groupChat._id,
        'chat_updated',
        'Chat settings were updated',
        { updatedBy: this.testUsers[0]._id }
      );

      this.testResults.push({
        test: 'System Messages',
        status: 'PASSED',
        details: 'Created join, leave, and update system messages'
      });

      console.log('✅ System messages test passed');
      return true;
    } catch (error) {
      this.testResults.push({
        test: 'System Messages',
        status: 'FAILED',
        error: error.message
      });
      console.error('❌ System messages test failed:', error);
      return false;
    }
  }

  // ================================
  // 🧹 CLEANUP
  // ================================

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test messages
      await ChatMessage.deleteMany({ 
        chatId: { $in: this.testChats.map(chat => chat._id) } 
      });

      // Delete test chats
      await TeamChat.deleteMany({ 
        _id: { $in: this.testChats.map(chat => chat._id) } 
      });

      // Delete test users
      await User.deleteMany({ 
        _id: { $in: this.testUsers.map(user => user._id) } 
      });

      // Delete test company
      if (this.testCompany) {
        await Company.deleteById(this.testCompany._id);
      }

      console.log('✅ Cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return false;
    }
  }

  // ================================
  // 🏃 RUN ALL TESTS
  // ================================

  async runAllTests() {
    console.log('🚀 Starting team chat system tests...\n');

    const startTime = Date.now();

    try {
      // Setup
      const setupSuccess = await this.setupTestData();
      if (!setupSuccess) {
        throw new Error('Test setup failed');
      }

      // Run tests
      await this.testTeamChatCreation();
      await this.testMessageOperations();
      await this.testParticipantManagement();
      await this.testChatQueries();
      await this.testUserProfileUpdates();
      await this.testSystemMessages();

      // Generate report
      this.generateTestReport(startTime);

      return true;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.generateTestReport(startTime);
      return false;
    } finally {
      // Always cleanup
      await this.cleanup();
    }
  }

  // ================================
  // 📊 REPORTING
  // ================================

  generateTestReport(startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEAM CHAT SYSTEM TEST REPORT');
    console.log('='.repeat(60));

    const passedTests = this.testResults.filter(test => test.status === 'PASSED');
    const failedTests = this.testResults.filter(test => test.status === 'FAILED');

    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`📈 Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passedTests.length}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    console.log(`📊 Success Rate: ${Math.round((passedTests.length / this.testResults.length) * 100)}%`);

    console.log('\n📋 Test Results:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      if (result.details) {
        console.log(`   └─ ${result.details}`);
      }
      if (result.error) {
        console.log(`   └─ Error: ${result.error}`);
      }
    });

    if (failedTests.length === 0) {
      console.log('\n🎉 All tests passed! Team chat system is working correctly.');
    } else {
      console.log(`\n⚠️  ${failedTests.length} test(s) failed. Please review the errors above.`);
    }

    console.log('='.repeat(60));
  }
}

// ================================
// 🎯 EXPORT AND EXECUTION
// ================================

module.exports = TeamChatSystemTest;

// Run tests if this file is executed directly
if (require.main === module) {
  const mongoose = require('mongoose');
  require('dotenv').config();

  async function runTests() {
    try {
      // Connect to test database
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/b2bbillings_test');
      console.log('Connected to test database');

      // Run tests
      const testSuite = new TeamChatSystemTest();
      await testSuite.runAllTests();

      // Disconnect
      await mongoose.disconnect();
      console.log('Disconnected from test database');
    } catch (error) {
      console.error('Test execution failed:', error);
      process.exit(1);
    }
  }

  runTests();
}