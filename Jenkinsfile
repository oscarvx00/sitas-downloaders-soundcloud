pipeline {
    agent {label '!master'}
    stages {
        stage ('Checkout') {
            steps {
                cleanWs()
                dir('sources'){
                    git url: 'https://github.com/oscarvx00/sitas-downloaders-soundcloud', branch: 'main'
                }
            }
        }
        stage('Test'){
            environment {
                scannerHome = tool 'SonarQubeScanner'
                RABBITMQ_ENDPOINT2 = credentials("RABBITMQ_ENDPOINT2")
                MINIO_INTERNAL_ENDPOINT = "oscarvx00.ddns.net"
                MINIO_INTERNAL_PORT = 10000
                MINIO_INTERNAL_USER = credentials("MINIO_INTERNAL_USER")
                MINIO_INTERNAL_PASS = credentials("MINIO_INTERNAL_PASS")
                MINIO_INTERNAL_BUCKET = "internal-storage-test"
                DOWNLOAD_REQUEST_EXCHANGE = "sitas-test-exchange-downloadrequest"
                DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE = "sitas-test-queue-downloadrequest-soundcloud"
                DOWNLOAD_COMPLETED_EXCHANGE = "sitas-test-exchange-downloadcompleted"
                SOUNDCLOUD_CLIENT_ID = credentials("SOUNDCLOUD_CLIENT_ID")
            } 
            steps {
                dir('test'){
                    sh 'cp -r -a ../sources/. ./'
                    sh 'cp -r -a containers/test/. ./'
                    sh """
                    docker build \
                        --build-arg RABBITMQ_ENDPOINT="${RABBITMQ_ENDPOINT2}" \
                        --build-arg MINIO_INTERNAL_ENDPOINT="${MINIO_INTERNAL_ENDPOINT}" \
                        --build-arg MINIO_INTERNAL_PORT="${MINIO_INTERNAL_PORT}" \
                        --build-arg MINIO_INTERNAL_USER=${MINIO_INTERNAL_USER} \
                        --build-arg MINIO_INTERNAL_PASS=${MINIO_INTERNAL_PASS} \
                        --build-arg MINIO_INTERNAL_BUCKET=${MINIO_INTERNAL_BUCKET} \
                        --build-arg DOWNLOAD_REQUEST_EXCHANGE=${DOWNLOAD_REQUEST_EXCHANGE} \
                        --build-arg DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE=${DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE} \
                        --build-arg DOWNLOAD_COMPLETED_EXCHANGE=${DOWNLOAD_COMPLETED_EXCHANGE} \
                        --build-arg SOUNDCLOUD_CLIENT_ID=${SOUNDCLOUD_CLIENT_ID} \
                        -t sitas-downloader-soundcloud-test .
                    """
                    sh 'docker container rm sitas-downloader-soundcloud-test-container || true'
                    sh 'docker run --name sitas-downloader-soundcloud-test-container sitas-downloader-soundcloud-test'
                    sh 'mkdir coverage'
                    sh 'docker cp sitas-downloader-soundcloud-test-container:/sitas-sc-test/coverage/. ./coverage'
                    sh 'docker container rm sitas-downloader-soundcloud-test-container'
                    withSonarQubeEnv('sonarqube'){
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                    script {
                        def qualitygate = waitForQualityGate()
                        if(qualitygate.status != 'OK'){
                            // "Pipeline aborted due to quality gate coverage failure."
                        }
                    }
                }
            }
        }
        stage('Deploy'){
            steps {
                dir('deploy') {
                        sh 'cp -r -a ../sources/. ./'
                        sh 'cp -r -a containers/prod/. ./'
    
                        sh """
                        docker build -t oscarvicente/sitas-downloaders-soundcloud-prod .
                        """
                        withCredentials([string(credentialsId: 'dockerhub-pass', variable: 'pass')]) {
                            sh "docker login --username oscarvicente --password $pass; docker push oscarvicente/sitas-downloaders-soundcloud-prod"
                        }
    
                        //Deploy in k8s, server configured
                        dir('kube'){
                            sh 'kubectl delete deploy -n sitas sitas-downloaders-soundcloud'
                            sh 'kubectl apply -f sitas-downloaders-soundcloud-deploy.yaml'
                        }
    
                    }
            }
        }
    }
    
}