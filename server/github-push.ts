import { getUncachableGitHubClient } from './github-client.js';
import * as fs from 'fs';
import * as path from 'path';

async function pushToGitHub() {
  try {
    console.log('Initializing GitHub push...');
    
    const octokit = await getUncachableGitHubClient();
    const owner = 'simoesdb-ship-it';
    const repo = 'Eve-app';
    const branch = 'main';

    // Get all files in the project
    const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []): string[] => {
      const files = fs.readdirSync(dirPath);

      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        
        // Skip node_modules, .git, and other build artifacts
        if (file === 'node_modules' || file === '.git' || file === 'dist' || 
            file === '.next' || file === 'build' || file === '.cache') {
          return;
        }

        if (fs.statSync(filePath).isDirectory()) {
          arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        } else {
          arrayOfFiles.push(filePath);
        }
      });

      return arrayOfFiles;
    };

    const files = getAllFiles('/home/runner/workspace');
    console.log(`Found ${files.length} files to upload`);

    // Create blobs for all files
    const blobs: { path: string; sha: string; mode: string }[] = [];
    
    for (const filePath of files) {
      const content = fs.readFileSync(filePath);
      const relativePath = path.relative('/home/runner/workspace', filePath);
      
      // Skip files that shouldn't be committed
      if (relativePath.startsWith('.replit') || relativePath === 'replit.nix') {
        continue;
      }

      try {
        const blob = await octokit.git.createBlob({
          owner,
          repo,
          content: content.toString('base64'),
          encoding: 'base64',
        });

        blobs.push({
          path: relativePath,
          sha: blob.data.sha,
          mode: '100644',
        });
      } catch (error) {
        console.error(`Error creating blob for ${relativePath}:`, error);
      }
    }

    console.log(`Created ${blobs.length} blobs`);

    // Git's universal empty tree SHA
    const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

    // Check if repository has any commits
    let baseCommitSha: string | undefined;
    let branchExists = true;
    
    try {
      const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      baseCommitSha = ref.object.sha;
      console.log(`Base commit SHA found: ${baseCommitSha}`);
    } catch (error) {
      console.log('Branch does not exist, will create it with initial commit');
      branchExists = false;
    }

    // If no branch exists, create an initial empty commit first
    if (!branchExists) {
      console.log('Creating initial empty commit...');
      const { data: initialCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: 'Initial commit',
        tree: EMPTY_TREE_SHA,
        parents: [],
      });
      
      console.log(`Initial commit created: ${initialCommit.sha}`);
      
      // Create the branch reference
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: initialCommit.sha,
      });
      
      console.log(`Branch ${branch} created`);
      baseCommitSha = initialCommit.sha;
    }

    // Get the base tree SHA from the commit
    const { data: baseCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha!,
    });

    // Create a tree with all files
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseCommit.tree.sha,
      tree: blobs,
    });

    console.log(`Created tree: ${tree.sha}`);

    // Create a commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo,
      message: 'Initial commit: Pattern Discovery App with Android build configuration',
      tree: tree.sha,
      parents: baseCommitSha ? [baseCommitSha] : [],
    });

    console.log(`Created commit: ${commit.sha}`);

    // Update the reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
      force: true,
    });

    console.log('✅ Successfully pushed all files to GitHub!');
    console.log(`View your repository: https://github.com/${owner}/${repo}`);
    console.log(`\nNext steps:`);
    console.log(`1. Go to https://github.com/${owner}/${repo}/actions`);
    console.log(`2. You should see the build workflow running automatically`);
    console.log(`3. Once complete, download the .aab file from the build artifacts`);
    console.log(`4. Upload the .aab to Google Play Console`);

  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    throw error;
  }
}

pushToGitHub().catch(console.error);
