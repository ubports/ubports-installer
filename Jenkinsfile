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
      parallel {
        stage("deb") {
          steps {
            sh 'npm run dist:linux:deb'
          }
        }
        stage("AppImage") {
          steps {
            sh 'npm run dist:linux:appimage'
          }
        }
        stage("snap") {
          steps {
            sh 'npm run dist:linux:snap'
            sh 'mv ./*.snap ./dist/.'
          }
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
