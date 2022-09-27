
pipeline {
    agent {label '!master'}
    stages {
        stage ('Checkout') {
            steps {
                dir('sources'){
                    git url: 'https://github.com/oscarvx00/sitas-downloaders-soundcloud', branch: 'main'
                }
            }
        }
        stage ('Test'){
            environment {
                scannerHome = tool 'SonarQubeScanner'
                RABBITMQ_ENDPOINT=credentials("RABBITMQ_ENDPOINT_COMPLETE")
                //MINIO_INTERNAL_ENDPOINT = ${MINIO_INTERNAL_ENDPOINT}
                MINIO_INTERNAL_USER = credentials("MINIO_INTERNAL_USER")
                MINIO_INTERNAL_PASS = credentials("MINIO_INTERNAL_PASS")
                MINIO_INTERNAL_BUCKET = "internal-storage-test"
                DOWNLOAD_REQUEST_EXCHANGE = "sitas-test-exchange-downloadrequest"
                DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE = "sitas-test-queue-downloadrequest"
                DOWNLOAD_COMPLETED_EXCHANGE = "sitas-test-exchange-downloadcompleted"
                SOUNDCLOUD_CLIENT_ID = "AH1HOCnlxQKahx111T3wjQlke9ceE2s9"
            }
            steps {
                dir('test') {
                    sh 'cp -r -a ../sources/. ./'
                    sh 'cp -r -a containers/test/. ./'
                    sh """
                    docker build \
                        --build-arg RABBITMQ_ENDPOINT=amqps://oaoesvtq:nnyfgti9CbBnS4-6Oq6iSWMncUhscG5d@goose.rmq2.cloudamqp.com/oaoesvtq \
                        --build-arg MINIO_INTERNAL_ENDPOINT=minio-oscarvx00.cloud.okteto.net \
                        --build-arg MINIO_INTERNAL_USER=myaccesskey \
                        --build-arg MINIO_INTERNAL_PASS=mysecretkey \
                        --build-arg MINIO_INTERNAL_BUCKET=internal-storage-test \
                        --build-arg DOWNLOAD_REQUEST_EXCHANGE=sitas-dev-exchange-downloadrequest \
                        --build-arg DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE=sitas-dev-queue-downloadrequest \
                        --build-arg DOWNLOAD_COMPLETED_EXCHANGE=sitas-dev-exchange-downloadcompleted \
                        --build-arg SOUNDCLOUD_CLIENT_ID=AH1HOCnlxQKahx111T3wjQlke9ceE2s9 \
                        -t sitas-downloader-soundcloud-test .
                    """
                    
                    //Run local tests, copy output files, upload to sq
                    sh "docker run --name sitas-downloader-soundcloud-test-container sitas-downloader-soundcloud-test"
                    sh "docker container cp sitas-downloader-soundcloud-test-container:/sitas-sc-test/coverage ./"
                    withSonarQubeEnv('sonarqube'){
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                    
                    script {
                        def qualitygate = waitForQualityGate()
                        if(qualitygate.status != 'OK'){
                            error "Pipeline aborted due to quality gate coverage failure."
                        }
                    }
                }
            }
        }
        
    }
    post{
        always {
            //cleanWs()
            sh "docker container rm sitas-downloader-soundcloud-test-container"
            sh 'echo end'
        }
    }
}