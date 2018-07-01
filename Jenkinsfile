pipeline {
  agent any
  stages {
    stage('Install') {
      steps {
        sh 'npm install nvm'
        sh 'nvm install 8'
        sh 'npm install'
        sh 'npm prune'
      }
    }
    stage('Build dist') {
      steps {
        sh 'npm run dist:linux'
      }
    }
  }
  post {
    success {
      archiveArtifacts(artifacts: 'dist/ubports-installer*', onlyIfSuccessful: true, fingerprint: true)
    }
  }
}
