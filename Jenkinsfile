pipeline {
  agent any
  stages {
    stage('Install') {
      steps {
        sh 'curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash'
        sh 'chmod +x "$HOME/.nvm/nvm.sh"'
        sh '$HOME/.nvm/nvm.sh install 8'
        sh 'npm install'
        sh 'npm prune'
      }
    }
    stage('Build dist') {
      steps {
        sh 'npm run dist:linux'
        sh 'snapcraft cleanbuild'
      }
    }
  }
  post {
    success {
      archiveArtifacts(artifacts: 'dist/ubports-installer*', onlyIfSuccessful: true, fingerprint: true)
    }
  }
}
