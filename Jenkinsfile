pipeline {
  agent any
  stages {
    stage('Install') {
      steps {
        try {
          sh 'curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash'
          sh 'chmod +x "$HOME/.nvm/nvm.sh"'
          sh '$HOME/.nvm/nvm.sh install 8'
          sh 'npm install'
          sh 'npm prune'
        } catch (e) {
          echo e
        }
      }
    }
    stage('Build') {
      steps {
        try {
          sh 'npm run dist:linux:deb'
          sh 'npm run dist:linux:appimage'
          sh 'npm run dist:linux:snap'
          sh 'mv ./*.snap ./dist/.'
        } catch (e) {
          echo e
        }
      }
    }
  }
  post {
    success {
      archiveArtifacts(artifacts: 'dist/ubports-installer*', onlyIfSuccessful: true, fingerprint: true)
    }
  }
}
