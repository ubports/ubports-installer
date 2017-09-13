pipeline {
  agent any
  stages {
    stage('Install') {
      steps {
        sh '''nvm install 6
npm install
npm prune'''
      }
    }
    stage('Build dist') {
      steps {
        sh 'npm run dist:linux'
      }
    }
    stage('') {
      steps {
        archiveArtifacts(artifacts: 'dist/ubports-installer*', onlyIfSuccessful: true, fingerprint: true)
      }
    }
  }
}