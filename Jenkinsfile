pipeline {
  agent any
  stages {
    stage('Install') {
      steps {
        sh '''npm install
npm prune'''
      }
    }
    stage('Build dist') {
      steps {
        sh 'npm run dist:linux'
      }
    }
    stage('error') {
      steps {
        archiveArtifacts(artifacts: 'dist/ubports-installer*', onlyIfSuccessful: true, fingerprint: true)
      }
    }
  }
}