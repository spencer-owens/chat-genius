/**
 * create-users.js
 * 
 * Script to create multiple users in Supabase using the Admin API.
 * 
 * Usage:
 *   node create-users.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Grab values from your .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a "service role" supabase client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Load radiology reports
const radReports = JSON.parse(fs.readFileSync('dummy_data/rad_reports.json', 'utf8'));
// Load AI posts
const aiPosts = JSON.parse(fs.readFileSync('dummy_data/ai_posts.json', 'utf8'));
// Load gauntlet posts
const gauntletPosts = JSON.parse(fs.readFileSync('dummy_data/gauntlet_posts.json', 'utf8'));

const users = [
  {
    email: 'fullstackhuman47+1@gmail.com',
    profilePic: 'radilogist_profile.jpeg',
    localPath: 'assets/radilogist_profile.jpeg',
    displayName: 'radiologist'
  },
  {
    email: 'fullstackhuman47+2@gmail.com',
    profilePic: 'ai_profile.jpeg',
    localPath: 'assets/ai_profile.jpeg',
    displayName: 'ai-expert'
  },
  {
    email: 'fullstackhuman47+3@gmail.com',
    profilePic: 'gaunltet_profile.png',
    localPath: 'assets/gaunltet_profile.png',
    displayName: 'gauntlet-expert'
  }
];

async function uploadProfilePic(filePath, fileName) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabaseAdmin.storage
      .from('profile-pics')
      .upload(fileName, fileBuffer, {
        contentType: path.extname(fileName) === '.png' ? 'image/png' : 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabaseAdmin.storage
      .from('profile-pics')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading profile pic ${fileName}:`, error);
    throw error;
  }
}

async function createRadiologyPosts(userId) {
  const channelId = '371ab9c4-1e57-4b54-a60b-65ee86f413fd';
  
  for (const report of radReports) {
    try {
      const { error } = await supabaseAdmin
        .from('posts')
        .insert({
          content: report.report,
          user_id: userId,
          channel_id: channelId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`\n❌ Error creating post for user ${userId}:\n`, error);
      } else {
        console.log(`\n✅ Created post in radiology channel for user ${userId}`);
      }
    } catch (err) {
      console.error(`\n❌ Error creating post:\n`, err);
    }
  }
}

async function createAIPosts(userId) {
  const channelId = '0046d16f-9438-4608-88c0-9702f8eeea33';
  
  for (const post of aiPosts) {
    try {
      const { error } = await supabaseAdmin
        .from('posts')
        .insert({
          content: post.content,
          user_id: userId,
          channel_id: channelId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`\n❌ Error creating AI post for user ${userId}:\n`, error);
      } else {
        console.log(`\n✅ Created post in AI channel for user ${userId}`);
      }
    } catch (err) {
      console.error(`\n❌ Error creating AI post:\n`, err);
    }
  }
}

async function createGauntletPosts(userId) {
  const channelId = '8fcadca8-69a1-4b96-ba41-794e96799502';
  
  for (const post of gauntletPosts) {
    try {
      const { error } = await supabaseAdmin
        .from('posts')
        .insert({
          content: post.content,
          user_id: userId,
          channel_id: channelId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`\n❌ Error creating gauntlet post for user ${userId}:\n`, error);
      } else {
        console.log(`\n✅ Created post in gauntlet channel for user ${userId}`);
      }
    } catch (err) {
      console.error(`\n❌ Error creating gauntlet post:\n`, err);
    }
  }
}

async function main() {
  let radiologistId = null;
  let aiExpertId = null;
  let gauntletExpertId = null;
  
  for (const user of users) {
    try {
      // First upload the profile picture
      const publicUrl = await uploadProfilePic(user.localPath, user.profilePic);
      
      // Create the user
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: 'password',
        email_confirm: true,
      });

      if (error) {
        console.error(`\n❌ Error creating user ${user.email}:\n`, error);
        continue;
      }

      // Add profile photo
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: data.user.id,
          profile_pic_url: publicUrl
        });

      if (profileError) {
        console.error(`\n❌ Error adding profile for user ${user.email}:\n`, profileError);
        continue;
      }

      // Update display name in public.users table
      const { error: displayNameError } = await supabaseAdmin
        .from('users')
        .update({
          display_name: user.displayName
        })
        .eq('id', data.user.id);

      if (displayNameError) {
        console.error(`\n❌ Error updating display name for user ${user.email}:\n`, displayNameError);
      } else {
        console.log(`\n✅ Created user: ${user.email} (ID: ${data.user.id}) with profile photo and display name`);
      }

      // Store the user IDs
      if (user === users[0]) {
        radiologistId = data.user.id;
      } else if (user === users[1]) {
        aiExpertId = data.user.id;
      } else if (user === users[2]) {
        gauntletExpertId = data.user.id;
      }
    } catch (err) {
      console.error(`\n❌ Error processing user ${user.email}:\n`, err);
    }
  }

  // Create posts for all users
  if (radiologistId) {
    await createRadiologyPosts(radiologistId);
  }
  if (aiExpertId) {
    await createAIPosts(aiExpertId);
  }
  if (gauntletExpertId) {
    await createGauntletPosts(gauntletExpertId);
  }
}

main()
  .then(() => {
    console.log('\nAll done!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nScript error:\n', err);
    process.exit(1);
  });
